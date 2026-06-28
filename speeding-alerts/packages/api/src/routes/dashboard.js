const pool = require('../db/pool');

async function dashboardRoutes(fastify) {
  const auth = { preHandler: fastify.authenticate };

  // GET /api/dashboard/kpis — cards principais
  fastify.get('/kpis', auth, async () => {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE occurred_at::date = CURRENT_DATE)             AS today,
        COUNT(*) FILTER (WHERE occurred_at >= date_trunc('week', NOW()))      AS this_week,
        COUNT(*) FILTER (WHERE occurred_at >= date_trunc('month', NOW()))     AS this_month,
        COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '24 hours')    AS last_24h,
        AVG(excess_speed) FILTER (WHERE occurred_at >= date_trunc('month', NOW())) AS avg_excess_month,
        MAX(excess_speed) FILTER (WHERE occurred_at >= date_trunc('month', NOW())) AS max_excess_month,
        COUNT(DISTINCT employee_id) FILTER (WHERE occurred_at >= date_trunc('month', NOW())) AS drivers_month,
        COUNT(DISTINCT vehicle_id) FILTER (WHERE occurred_at >= date_trunc('month', NOW()))  AS vehicles_month
      FROM speed_alerts
    `);
    return rows[0];
  });

  // GET /api/dashboard/recent — últimos alertas (feed tempo real)
  fastify.get('/recent', auth, async (req) => {
    const limit = Math.min(parseInt(req.query.limit || '20'), 100);
    const { rows } = await pool.query(`
      SELECT sa.id, sa.occurred_at, sa.recorded_speed, sa.speed_limit,
             sa.excess_speed, sa.city, sa.address, sa.map_link,
             e.name AS employee_name, e.registration,
             v.plate, b.name AS base_name,
             i.occurrence_number, i.severity, i.status AS infraction_status
      FROM speed_alerts sa
      LEFT JOIN employees e   ON e.id = sa.employee_id
      LEFT JOIN vehicles  v   ON v.id = sa.vehicle_id
      LEFT JOIN bases     b   ON b.id = sa.base_id
      LEFT JOIN infractions i ON i.alert_id = sa.id
      ORDER BY sa.occurred_at DESC
      LIMIT $1
    `, [limit]);
    return rows;
  });

  // GET /api/dashboard/ranking/employees — top infratores
  fastify.get('/ranking/employees', auth, async (req) => {
    const { period = '30', limit = 10 } = req.query;
    const { rows } = await pool.query(`
      SELECT e.id, e.name, e.registration, b.name AS base_name,
             COUNT(sa.id) AS total_alerts,
             AVG(sa.excess_speed)::numeric(5,1) AS avg_excess,
             MAX(sa.excess_speed) AS max_excess,
             MAX(i.occurrence_number) AS max_occurrence,
             MAX(i.severity) AS max_severity
      FROM speed_alerts sa
      JOIN employees e ON e.id = sa.employee_id
      LEFT JOIN bases b ON b.id = e.base_id
      LEFT JOIN infractions i ON i.alert_id = sa.id
      WHERE sa.occurred_at >= NOW() - ($1 || ' days')::interval
      GROUP BY e.id, e.name, e.registration, b.name
      ORDER BY total_alerts DESC, max_excess DESC
      LIMIT $2
    `, [period, limit]);
    return rows;
  });

  // GET /api/dashboard/ranking/vehicles — top veículos
  fastify.get('/ranking/vehicles', auth, async (req) => {
    const { period = '30', limit = 10 } = req.query;
    const { rows } = await pool.query(`
      SELECT v.id, v.plate, v.model, v.brand, b.name AS base_name,
             COUNT(sa.id) AS total_alerts,
             AVG(sa.excess_speed)::numeric(5,1) AS avg_excess,
             MAX(sa.excess_speed) AS max_excess
      FROM speed_alerts sa
      JOIN vehicles v ON v.id = sa.vehicle_id
      LEFT JOIN bases b ON b.id = v.base_id
      WHERE sa.occurred_at >= NOW() - ($1 || ' days')::interval
      GROUP BY v.id, v.plate, v.model, v.brand, b.name
      ORDER BY total_alerts DESC
      LIMIT $2
    `, [period, limit]);
    return rows;
  });

  // GET /api/dashboard/ranking/bases — ranking por base
  fastify.get('/ranking/bases', auth, async (req) => {
    const { period = '30' } = req.query;
    const { rows } = await pool.query(`
      SELECT b.id, b.name, b.city,
             COUNT(sa.id) AS total_alerts,
             COUNT(DISTINCT sa.employee_id) AS drivers_count,
             AVG(sa.excess_speed)::numeric(5,1) AS avg_excess
      FROM speed_alerts sa
      LEFT JOIN bases b ON b.id = sa.base_id
      WHERE sa.occurred_at >= NOW() - ($1 || ' days')::interval
      GROUP BY b.id, b.name, b.city
      ORDER BY total_alerts DESC
    `, [period]);
    return rows;
  });

  // GET /api/dashboard/chart/monthly — evolução mensal (12 meses)
  fastify.get('/chart/monthly', auth, async () => {
    const { rows } = await pool.query(`
      SELECT to_char(date_trunc('month', occurred_at), 'YYYY-MM') AS month,
             COUNT(*) AS total,
             AVG(excess_speed)::numeric(5,1) AS avg_excess,
             COUNT(DISTINCT employee_id) AS drivers
      FROM speed_alerts
      WHERE occurred_at >= NOW() - INTERVAL '12 months'
      GROUP BY date_trunc('month', occurred_at)
      ORDER BY date_trunc('month', occurred_at)
    `);
    return rows;
  });

  // GET /api/dashboard/chart/hourly — distribuição por hora do dia
  fastify.get('/chart/hourly', auth, async (req) => {
    const { period = '30' } = req.query;
    const { rows } = await pool.query(`
      SELECT EXTRACT(HOUR FROM occurred_at AT TIME ZONE 'America/Sao_Paulo')::int AS hour,
             COUNT(*) AS total
      FROM speed_alerts
      WHERE occurred_at >= NOW() - ($1 || ' days')::interval
      GROUP BY hour ORDER BY hour
    `, [period]);
    return rows;
  });

  // GET /api/dashboard/chart/weekday — distribuição por dia da semana
  fastify.get('/chart/weekday', auth, async (req) => {
    const { period = '30' } = req.query;
    const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const { rows } = await pool.query(`
      SELECT EXTRACT(DOW FROM occurred_at AT TIME ZONE 'America/Sao_Paulo')::int AS dow,
             COUNT(*) AS total
      FROM speed_alerts
      WHERE occurred_at >= NOW() - ($1 || ' days')::interval
      GROUP BY dow ORDER BY dow
    `, [period]);
    return rows.map(r => ({ ...r, day_name: days[r.dow] }));
  });

  // GET /api/dashboard/map — coordenadas para o mapa
  fastify.get('/map', auth, async (req) => {
    const { period = '7' } = req.query;
    const { rows } = await pool.query(`
      SELECT sa.id, sa.latitude, sa.longitude, sa.occurred_at,
             sa.recorded_speed, sa.speed_limit, sa.excess_speed,
             sa.city, sa.address, e.name AS employee_name, v.plate
      FROM speed_alerts sa
      LEFT JOIN employees e ON e.id = sa.employee_id
      LEFT JOIN vehicles  v ON v.id = sa.vehicle_id
      WHERE sa.latitude IS NOT NULL AND sa.longitude IS NOT NULL
        AND sa.occurred_at >= NOW() - ($1 || ' days')::interval
      ORDER BY sa.occurred_at DESC
      LIMIT 500
    `, [period]);
    return rows;
  });

  // GET /api/dashboard/recurrences — funcionários reincidentes
  fastify.get('/recurrences', auth, async (req) => {
    const { min_alerts = 3, period = '30' } = req.query;
    const { rows } = await pool.query(`
      SELECT e.id, e.name, e.registration, e.phone, e.whatsapp,
             b.name AS base_name,
             COUNT(sa.id) AS total_alerts,
             MAX(i.occurrence_number) AS max_occurrence,
             MAX(i.severity) AS max_severity,
             MAX(sa.occurred_at) AS last_alert,
             MAX(sa.excess_speed) AS max_excess
      FROM speed_alerts sa
      JOIN employees e ON e.id = sa.employee_id
      LEFT JOIN bases b ON b.id = e.base_id
      LEFT JOIN infractions i ON i.alert_id = sa.id
      WHERE sa.occurred_at >= NOW() - ($2 || ' days')::interval
      GROUP BY e.id, e.name, e.registration, e.phone, e.whatsapp, b.name
      HAVING COUNT(sa.id) >= $1
      ORDER BY total_alerts DESC
    `, [min_alerts, period]);
    return rows;
  });
}

module.exports = dashboardRoutes;
