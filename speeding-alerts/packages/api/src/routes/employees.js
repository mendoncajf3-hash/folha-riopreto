const pool = require('../db/pool');

async function employeeRoutes(fastify) {
  const auth = { preHandler: fastify.authenticate };
  const adminOnly = { preHandler: fastify.requireRole(['SUPERADMIN', 'ADMIN']) };

  // GET /api/employees
  fastify.get('/', auth, async (req) => {
    const { search, base_id, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(e.name ILIKE $${params.length} OR e.registration ILIKE $${params.length})`);
    }
    if (base_id) {
      params.push(base_id);
      conditions.push(`e.base_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`e.status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const { rows } = await pool.query(`
      SELECT e.id, e.registration, e.name, e.role, e.phone, e.whatsapp,
             e.cost_center, e.hired_at, e.status, e.notes,
             b.name AS base_name, b.city AS base_city,
             COUNT(*) OVER() AS total_count,
             (SELECT COUNT(*) FROM speed_alerts sa WHERE sa.employee_id = e.id) AS total_alerts,
             (SELECT COUNT(*) FROM speed_alerts sa
              WHERE sa.employee_id = e.id
              AND sa.occurred_at >= NOW() - INTERVAL '30 days') AS alerts_30d
      FROM employees e
      LEFT JOIN bases b ON b.id = e.base_id
      ${where}
      ORDER BY e.name
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const total = rows[0]?.total_count || 0;
    return {
      data: rows.map(r => { const { total_count, ...rest } = r; return rest; }),
      pagination: { page: +page, limit: +limit, total: +total, pages: Math.ceil(total / limit) }
    };
  });

  // GET /api/employees/:id
  fastify.get('/:id', auth, async (req, reply) => {
    const { rows } = await pool.query(`
      SELECT e.*, b.name AS base_name, b.city AS base_city
      FROM employees e
      LEFT JOIN bases b ON b.id = e.base_id
      WHERE e.id = $1
    `, [req.params.id]);
    if (!rows[0]) return reply.code(404).send({ error: 'Funcionário não encontrado' });
    return rows[0];
  });

  // GET /api/employees/:id/alerts
  fastify.get('/:id/alerts', auth, async (req) => {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const { rows } = await pool.query(`
      SELECT sa.*, v.plate, v.model,
             COUNT(*) OVER() AS total_count
      FROM speed_alerts sa
      LEFT JOIN vehicles v ON v.id = sa.vehicle_id
      WHERE sa.employee_id = $1
      ORDER BY sa.occurred_at DESC
      LIMIT $2 OFFSET $3
    `, [req.params.id, limit, offset]);
    const total = rows[0]?.total_count || 0;
    return {
      data: rows.map(r => { const { total_count, ...rest } = r; return rest; }),
      pagination: { page: +page, limit: +limit, total: +total }
    };
  });

  // POST /api/employees
  fastify.post('/', adminOnly, async (req, reply) => {
    const { registration, name, role, base_id, phone, whatsapp, cost_center, hired_at, status, notes } = req.body;
    if (!registration || !name) return reply.code(400).send({ error: 'Matrícula e nome são obrigatórios' });

    const defaultCompany = await pool.query('SELECT id FROM companies LIMIT 1');
    const company_id = defaultCompany.rows[0]?.id;

    try {
      const { rows } = await pool.query(`
        INSERT INTO employees (company_id, base_id, registration, name, role, phone, whatsapp,
                               cost_center, hired_at, status, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [company_id, base_id || null, registration.trim(), name.trim().toUpperCase(),
          role || null, phone || null, whatsapp || null,
          cost_center || null, hired_at || null, status || 'ACTIVE', notes || null]);

      await _audit(req, 'CREATE', 'employees', rows[0].id, null, rows[0]);
      return reply.code(201).send(rows[0]);
    } catch (err) {
      if (err.code === '23505') return reply.code(409).send({ error: 'Matrícula já cadastrada' });
      throw err;
    }
  });

  // PUT /api/employees/:id
  fastify.put('/:id', adminOnly, async (req, reply) => {
    const { name, role, base_id, phone, whatsapp, cost_center, hired_at, status, notes } = req.body;
    const { rows: old } = await pool.query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
    if (!old[0]) return reply.code(404).send({ error: 'Funcionário não encontrado' });

    const { rows } = await pool.query(`
      UPDATE employees SET
        name = COALESCE($1, name), role = COALESCE($2, role),
        base_id = COALESCE($3, base_id), phone = $4, whatsapp = $5,
        cost_center = COALESCE($6, cost_center), hired_at = COALESCE($7, hired_at),
        status = COALESCE($8, status), notes = $9, updated_at = NOW()
      WHERE id = $10 RETURNING *
    `, [name?.trim().toUpperCase() || null, role || null, base_id || null,
        phone || null, whatsapp || null, cost_center || null, hired_at || null,
        status || null, notes !== undefined ? notes : old[0].notes, req.params.id]);

    await _audit(req, 'UPDATE', 'employees', req.params.id, old[0], rows[0]);
    return rows[0];
  });

  // DELETE /api/employees/:id
  fastify.delete('/:id', adminOnly, async (req, reply) => {
    const { rows } = await pool.query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
    if (!rows[0]) return reply.code(404).send({ error: 'Funcionário não encontrado' });
    await pool.query("UPDATE employees SET status = 'TERMINATED', updated_at = NOW() WHERE id = $1", [req.params.id]);
    await _audit(req, 'DEACTIVATE', 'employees', req.params.id, rows[0], null);
    return { ok: true };
  });

  async function _audit(req, action, entity, entityId, oldVal, newVal) {
    await pool.query(
      `INSERT INTO audit_logs (user_id, username, action, entity, entity_id, old_value, new_value, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [req.user.id, req.user.username, action, entity, entityId,
       oldVal ? JSON.stringify(oldVal) : null,
       newVal ? JSON.stringify(newVal) : null,
       req.ip]
    );
  }
}

module.exports = employeeRoutes;
