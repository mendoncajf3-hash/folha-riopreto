const pool = require('../db/pool');

async function baseRoutes(fastify) {
  const auth      = { preHandler: fastify.authenticate };
  const adminOnly = { preHandler: fastify.requireRole(['SUPERADMIN', 'ADMIN']) };

  fastify.get('/', auth, async () => {
    const { rows } = await pool.query(`
      SELECT b.*, c.name AS company_name,
             COUNT(DISTINCT e.id) AS employee_count,
             COUNT(DISTINCT v.id) AS vehicle_count
      FROM bases b
      LEFT JOIN companies c ON c.id = b.company_id
      LEFT JOIN employees e ON e.base_id = b.id AND e.status = 'ACTIVE'
      LEFT JOIN vehicles v ON v.base_id = b.id AND v.active = true
      GROUP BY b.id, c.name
      ORDER BY b.name
    `);
    return rows;
  });

  fastify.post('/', adminOnly, async (req, reply) => {
    const { name, city, state } = req.body;
    if (!name) return reply.code(400).send({ error: 'Nome é obrigatório' });
    const company = await pool.query('SELECT id FROM companies LIMIT 1');
    const { rows } = await pool.query(`
      INSERT INTO bases (company_id, name, city, state) VALUES ($1, $2, $3, $4) RETURNING *
    `, [company.rows[0]?.id, name.trim().toUpperCase(), city || null, state || 'SP']);
    return reply.code(201).send(rows[0]);
  });

  fastify.put('/:id', adminOnly, async (req, reply) => {
    const { name, city, state } = req.body;
    const { rows } = await pool.query(`
      UPDATE bases SET name = COALESCE($1, name), city = COALESCE($2, city),
                       state = COALESCE($3, state) WHERE id = $4 RETURNING *
    `, [name?.trim().toUpperCase() || null, city || null, state || null, req.params.id]);
    if (!rows[0]) return reply.code(404).send({ error: 'Base não encontrada' });
    return rows[0];
  });
}

module.exports = baseRoutes;
