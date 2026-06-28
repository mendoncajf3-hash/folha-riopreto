const bcrypt = require('bcryptjs');
const fs     = require('fs');
const pool   = require('../db/pool');
const config = require('../config');

async function adminRoutes(fastify) {
  const adminOnly = { preHandler: fastify.requireRole(['SUPERADMIN', 'ADMIN']) };
  const superOnly = { preHandler: fastify.requireRole(['SUPERADMIN']) };

  // ── USUÁRIOS ──────────────────────────────────────────────────

  fastify.get('/users', adminOnly, async () => {
    const { rows } = await pool.query(`
      SELECT id, username, name, role, active, last_login, created_at
      FROM system_users ORDER BY name
    `);
    return rows;
  });

  fastify.post('/users', superOnly, async (req, reply) => {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name) {
      return reply.code(400).send({ error: 'Login, senha e nome são obrigatórios' });
    }
    const hash = await bcrypt.hash(password, 12);
    try {
      const { rows } = await pool.query(`
        INSERT INTO system_users (username, password_hash, name, role)
        VALUES ($1, $2, $3, $4) RETURNING id, username, name, role, active
      `, [username.toLowerCase().trim(), hash, name.trim(),
          ['SUPERADMIN','ADMIN','MANAGER','VIEWER'].includes(role) ? role : 'VIEWER']);
      return reply.code(201).send(rows[0]);
    } catch (err) {
      if (err.code === '23505') return reply.code(409).send({ error: 'Login já existe' });
      throw err;
    }
  });

  fastify.put('/users/:id', superOnly, async (req, reply) => {
    const { name, role, active, password } = req.body;
    if (password) {
      const hash = await bcrypt.hash(password, 12);
      await pool.query('UPDATE system_users SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);
    }
    const { rows } = await pool.query(`
      UPDATE system_users SET
        name = COALESCE($1, name), role = COALESCE($2, role),
        active = COALESCE($3, active)
      WHERE id = $4
      RETURNING id, username, name, role, active
    `, [name || null, role || null, active !== undefined ? active : null, req.params.id]);
    if (!rows[0]) return reply.code(404).send({ error: 'Usuário não encontrado' });
    return rows[0];
  });

  // ── TEMPLATES DE MENSAGEM ─────────────────────────────────────

  fastify.get('/templates', { preHandler: fastify.authenticate }, async () => {
    const { rows } = await pool.query(`
      SELECT * FROM message_templates ORDER BY occurrence_number
    `);
    return rows;
  });

  fastify.put('/templates/:id', adminOnly, async (req, reply) => {
    const { template_text, tone, use_ai, active } = req.body;
    const { rows } = await pool.query(`
      UPDATE message_templates SET
        template_text = COALESCE($1, template_text),
        tone = COALESCE($2, tone),
        use_ai = COALESCE($3, use_ai),
        active = COALESCE($4, active),
        updated_at = NOW()
      WHERE id = $5 RETURNING *
    `, [template_text || null, tone || null,
        use_ai !== undefined ? use_ai : null,
        active !== undefined ? active : null, req.params.id]);
    if (!rows[0]) return reply.code(404).send({ error: 'Template não encontrado' });
    return rows[0];
  });

  // ── CONFIGURAÇÕES ─────────────────────────────────────────────

  fastify.get('/config', { preHandler: fastify.authenticate }, async () => {
    const { rows } = await pool.query('SELECT key, value, label FROM system_config ORDER BY key');
    return rows;
  });

  fastify.put('/config', adminOnly, async (req, reply) => {
    const updates = req.body; // { key: value, ... }
    if (!updates || typeof updates !== 'object') {
      return reply.code(400).send({ error: 'Body inválido' });
    }
    for (const [key, value] of Object.entries(updates)) {
      await pool.query(`
        INSERT INTO system_config (key, value, updated_at, updated_by)
        VALUES ($1, $2, NOW(), $3)
        ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW(), updated_by = $3
      `, [key, String(value), req.user.id]);
    }
    return { ok: true };
  });

  // ── IMPORTAÇÃO DO SISTEMA LEGADO ──────────────────────────────

  fastify.post('/import/legacy', superOnly, async (req, reply) => {
    const dbPath = config.legacy.dbPath;
    if (!dbPath || !fs.existsSync(dbPath)) {
      return reply.code(404).send({ error: 'Arquivo do sistema legado não encontrado' });
    }

    const legacy = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const cadastro = legacy.cadastro || [];
    const usuarios = legacy.usuarios || [];

    const baseMap = {
      'SAO JOSE RIO PRETO': '00000000-0000-0000-0000-000000000010',
      'MIRASSOL':           '00000000-0000-0000-0000-000000000011',
      'BADY BASSITT':       '00000000-0000-0000-0000-000000000012',
    };

    let importedEmployees = 0, skippedEmployees = 0;
    let importedUsers = 0;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const company = await client.query('SELECT id FROM companies LIMIT 1');
      const company_id = company.rows[0]?.id;

      // Importar funcionários
      for (const c of cadastro) {
        if (!c.matr || !c.nome) { skippedEmployees++; continue; }
        const base_id = baseMap[c.base] || null;
        const status = c.situacao === 'DEMITIDO' ? 'TERMINATED' : 'ACTIVE';

        try {
          await client.query(`
            INSERT INTO employees (company_id, base_id, registration, name, role,
                                   cost_center, hired_at, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (registration) DO UPDATE SET
              name = EXCLUDED.name, role = EXCLUDED.role,
              base_id = EXCLUDED.base_id, status = EXCLUDED.status,
              updated_at = NOW()
          `, [company_id, base_id, c.matr.trim(), c.nome.trim().toUpperCase(),
              c.funcao || null, c.cc || null,
              c.admissao || null, status]);
          importedEmployees++;
        } catch { skippedEmployees++; }
      }

      // Importar usuários (com senha segura temporária)
      const tempHash = await bcrypt.hash('Mudar@2024', 12);
      for (const u of usuarios) {
        const login = (u.usuario || '').toLowerCase().trim();
        if (!login) continue;
        const role = u.role === 'ADMIN' ? 'ADMIN' : 'VIEWER';
        try {
          await client.query(`
            INSERT INTO system_users (username, password_hash, name, role)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (username) DO NOTHING
          `, [login, tempHash, u.name || login, role]);
          importedUsers++;
        } catch { /* skip */ }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return {
      ok: true,
      imported: { employees: importedEmployees, users: importedUsers },
      skipped:  { employees: skippedEmployees },
      note: 'Usuários importados com senha temporária: Mudar@2024 — solicite troca imediata.'
    };
  });

  // ── LOGS DE AUDITORIA ─────────────────────────────────────────

  fastify.get('/audit', adminOnly, async (req) => {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const { rows } = await pool.query(`
      SELECT a.*, COUNT(*) OVER() AS total_count
      FROM audit_logs a
      ORDER BY a.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    const total = rows[0]?.total_count || 0;
    return {
      data: rows.map(r => { const { total_count, ...rest } = r; return rest; }),
      pagination: { page: +page, limit: +limit, total: +total }
    };
  });
}

module.exports = adminRoutes;
