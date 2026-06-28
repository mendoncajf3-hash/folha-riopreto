const pool = require('../db/pool');

async function alertRoutes(fastify) {
  const auth      = { preHandler: fastify.authenticate };
  const adminOnly = { preHandler: fastify.requireRole(['SUPERADMIN', 'ADMIN', 'MANAGER']) };

  // GET /api/alerts — listagem com filtros
  fastify.get('/', auth, async (req) => {
    const { employee_id, vehicle_id, base_id, plate, employee_name,
            date_from, date_to, page = 1, limit = 50, order = 'desc' } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (employee_id) { params.push(employee_id); conditions.push(`sa.employee_id = $${params.length}`); }
    if (vehicle_id)  { params.push(vehicle_id);  conditions.push(`sa.vehicle_id = $${params.length}`); }
    if (base_id)     { params.push(base_id);     conditions.push(`sa.base_id = $${params.length}`); }
    if (plate)       { params.push(`%${plate}%`); conditions.push(`v.plate ILIKE $${params.length}`); }
    if (employee_name) {
      params.push(`%${employee_name}%`);
      conditions.push(`e.name ILIKE $${params.length}`);
    }
    if (date_from) { params.push(date_from); conditions.push(`sa.occurred_at >= $${params.length}::date`); }
    if (date_to)   { params.push(date_to);   conditions.push(`sa.occurred_at < ($${params.length}::date + INTERVAL '1 day')`); }

    const where   = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = order === 'asc' ? 'ASC' : 'DESC';
    params.push(limit, offset);

    const { rows } = await pool.query(`
      SELECT sa.id, sa.alert_number, sa.occurred_at,
             sa.recorded_speed, sa.speed_limit, sa.excess_speed,
             sa.city, sa.address, sa.map_link, sa.latitude, sa.longitude,
             e.id AS employee_id, e.name AS employee_name, e.registration,
             e.phone AS employee_phone, e.whatsapp AS employee_whatsapp,
             v.id AS vehicle_id, v.plate, v.model AS vehicle_model,
             b.name AS base_name,
             i.occurrence_number, i.severity, i.status AS infraction_status,
             COUNT(*) OVER() AS total_count
      FROM speed_alerts sa
      LEFT JOIN employees e ON e.id = sa.employee_id
      LEFT JOIN vehicles  v ON v.id = sa.vehicle_id
      LEFT JOIN bases     b ON b.id = sa.base_id
      LEFT JOIN infractions i ON i.alert_id = sa.id
      ${where}
      ORDER BY sa.occurred_at ${orderBy}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const total = rows[0]?.total_count || 0;
    return {
      data: rows.map(r => { const { total_count, ...rest } = r; return rest; }),
      pagination: { page: +page, limit: +limit, total: +total, pages: Math.ceil(total / limit) }
    };
  });

  // GET /api/alerts/:id
  fastify.get('/:id', auth, async (req, reply) => {
    const { rows } = await pool.query(`
      SELECT sa.*,
             e.name AS employee_name, e.registration, e.phone, e.whatsapp,
             v.plate, v.model AS vehicle_model,
             b.name AS base_name,
             i.occurrence_number, i.severity, i.status AS infraction_status,
             (SELECT json_agg(wm ORDER BY wm.created_at DESC)
              FROM whatsapp_messages wm WHERE wm.infraction_id = i.id) AS messages
      FROM speed_alerts sa
      LEFT JOIN employees e   ON e.id = sa.employee_id
      LEFT JOIN vehicles  v   ON v.id = sa.vehicle_id
      LEFT JOIN bases     b   ON b.id = sa.base_id
      LEFT JOIN infractions i ON i.alert_id = sa.id
      WHERE sa.id = $1
    `, [req.params.id]);
    if (!rows[0]) return reply.code(404).send({ error: 'Alerta não encontrado' });
    return rows[0];
  });

  // POST /api/alerts — entrada manual de alerta (até o parser de e-mail estar pronto)
  fastify.post('/', adminOnly, async (req, reply) => {
    const {
      employee_id, vehicle_id, base_id, occurred_at, recorded_speed,
      speed_limit, city, address, latitude, longitude, map_link,
      alert_number, company_name, extra_data
    } = req.body;

    if (!occurred_at || !recorded_speed || !speed_limit) {
      return reply.code(400).send({ error: 'Data, velocidade registrada e limite são obrigatórios' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insere o alerta
      const { rows: [alert] } = await client.query(`
        INSERT INTO speed_alerts (
          employee_id, vehicle_id, base_id, alert_number, occurred_at,
          recorded_speed, speed_limit, city, address, latitude, longitude,
          map_link, company_name, extra_data
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING *
      `, [employee_id||null, vehicle_id||null, base_id||null,
          alert_number||null, occurred_at, recorded_speed, speed_limit,
          city||null, address||null, latitude||null, longitude||null,
          map_link||null, company_name||null,
          JSON.stringify(extra_data||{})]);

      // Calcula número de ocorrência no período (últimos 30 dias)
      const windowDays = 30;
      const { rows: [{ count }] } = await client.query(`
        SELECT COUNT(*) FROM speed_alerts
        WHERE employee_id = $1
          AND occurred_at >= NOW() - INTERVAL '${windowDays} days'
          AND id != $2
      `, [employee_id||null, alert.id]);

      const occurrenceNumber = parseInt(count) + 1;

      // Determina severity
      const excess = recorded_speed - speed_limit;
      let severity = 'LOW';
      if (occurrenceNumber >= 5 || excess >= 40) severity = 'CRITICAL';
      else if (occurrenceNumber >= 3 || excess >= 25) severity = 'HIGH';
      else if (occurrenceNumber >= 2 || excess >= 15) severity = 'MEDIUM';

      // Cria infração
      const { rows: [infraction] } = await client.query(`
        INSERT INTO infractions (alert_id, employee_id, vehicle_id, occurrence_number, severity,
                                  period_start, period_end)
        VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${windowDays} days', NOW())
        RETURNING *
      `, [alert.id, employee_id||null, vehicle_id||null, occurrenceNumber, severity]);

      await client.query('COMMIT');

      // Emite evento SSE para dashboard em tempo real
      fastify.sse?.emit('new-alert', { alert, infraction });

      return reply.code(201).send({ alert, infraction });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });

  // PATCH /api/alerts/:id/status — atualiza status da infração
  fastify.patch('/:id/status', adminOnly, async (req, reply) => {
    const { status } = req.body;
    const valid = ['PENDING','NOTIFIED','ACKNOWLEDGED','ESCALATED'];
    if (!valid.includes(status)) {
      return reply.code(400).send({ error: 'Status inválido' });
    }
    const { rows } = await pool.query(`
      UPDATE infractions SET status = $1
      WHERE alert_id = $2 RETURNING *
    `, [status, req.params.id]);
    if (!rows[0]) return reply.code(404).send({ error: 'Alerta não encontrado' });
    return rows[0];
  });
}

module.exports = alertRoutes;
