const pool = require('../db/pool');

async function vehicleRoutes(fastify) {
  const auth      = { preHandler: fastify.authenticate };
  const adminOnly = { preHandler: fastify.requireRole(['SUPERADMIN', 'ADMIN']) };

  // GET /api/vehicles
  fastify.get('/', auth, async (req) => {
    const { search, base_id, active, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(v.plate ILIKE $${params.length} OR v.model ILIKE $${params.length} OR v.brand ILIKE $${params.length})`);
    }
    if (base_id) { params.push(base_id); conditions.push(`v.base_id = $${params.length}`); }
    if (active !== undefined) { params.push(active === 'true'); conditions.push(`v.active = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const { rows } = await pool.query(`
      SELECT v.*, b.name AS base_name,
             COUNT(*) OVER() AS total_count,
             (SELECT COUNT(*) FROM speed_alerts sa WHERE sa.vehicle_id = v.id) AS total_alerts,
             (SELECT COUNT(*) FROM speed_alerts sa
              WHERE sa.vehicle_id = v.id AND sa.occurred_at >= NOW() - INTERVAL '30 days') AS alerts_30d
      FROM vehicles v
      LEFT JOIN bases b ON b.id = v.base_id
      ${where}
      ORDER BY v.plate
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const total = rows[0]?.total_count || 0;
    return {
      data: rows.map(r => { const { total_count, ...rest } = r; return rest; }),
      pagination: { page: +page, limit: +limit, total: +total }
    };
  });

  // GET /api/vehicles/:id
  fastify.get('/:id', auth, async (req, reply) => {
    const { rows } = await pool.query(`
      SELECT v.*, b.name AS base_name FROM vehicles v
      LEFT JOIN bases b ON b.id = v.base_id WHERE v.id = $1
    `, [req.params.id]);
    if (!rows[0]) return reply.code(404).send({ error: 'Veículo não encontrado' });
    return rows[0];
  });

  // POST /api/vehicles
  fastify.post('/', adminOnly, async (req, reply) => {
    const { plate, model, brand, year, base_id, tracker_id } = req.body;
    if (!plate) return reply.code(400).send({ error: 'Placa é obrigatória' });

    const defaultCompany = await pool.query('SELECT id FROM companies LIMIT 1');
    const company_id = defaultCompany.rows[0]?.id;

    try {
      const { rows } = await pool.query(`
        INSERT INTO vehicles (company_id, base_id, plate, model, brand, year, tracker_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
      `, [company_id, base_id || null, plate.trim().toUpperCase(),
          model || null, brand || null, year || null, tracker_id || null]);
      return reply.code(201).send(rows[0]);
    } catch (err) {
      if (err.code === '23505') return reply.code(409).send({ error: 'Placa já cadastrada' });
      throw err;
    }
  });

  // PUT /api/vehicles/:id
  fastify.put('/:id', adminOnly, async (req, reply) => {
    const { model, brand, year, base_id, tracker_id, active } = req.body;
    const { rows } = await pool.query(`
      UPDATE vehicles SET
        model = COALESCE($1, model), brand = COALESCE($2, brand),
        year = COALESCE($3, year), base_id = COALESCE($4, base_id),
        tracker_id = COALESCE($5, tracker_id),
        active = COALESCE($6, active), updated_at = NOW()
      WHERE id = $7 RETURNING *
    `, [model || null, brand || null, year || null, base_id || null,
        tracker_id || null, active !== undefined ? active : null, req.params.id]);
    if (!rows[0]) return reply.code(404).send({ error: 'Veículo não encontrado' });
    return rows[0];
  });
}

module.exports = vehicleRoutes;
