const bcrypt = require('bcryptjs');
const pool   = require('../db/pool');

async function authRoutes(fastify) {
  // POST /api/auth/login
  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', minLength: 2, maxLength: 50 },
          password: { type: 'string', minLength: 4, maxLength: 100 },
        },
      },
    },
  }, async (req, reply) => {
    const { username, password } = req.body;

    const { rows } = await pool.query(
      `SELECT id, username, password_hash, name, role, active
       FROM system_users WHERE username = $1`,
      [username.toLowerCase().trim()]
    );

    const user = rows[0];
    if (!user || !user.active) {
      return reply.code(401).send({ error: 'Usuário ou senha incorretos' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return reply.code(401).send({ error: 'Usuário ou senha incorretos' });
    }

    await pool.query(
      'UPDATE system_users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    const token = fastify.jwt.sign({
      id:       user.id,
      username: user.username,
      name:     user.name,
      role:     user.role,
    });

    return { token, user: { id: user.id, username: user.username, name: user.name, role: user.role } };
  });

  // GET /api/auth/me
  fastify.get('/me', { preHandler: fastify.authenticate }, async (req) => {
    return { user: req.user };
  });

  // POST /api/auth/change-password
  fastify.post('/change-password', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return reply.code(400).send({ error: 'Senha inválida (mínimo 6 caracteres)' });
    }

    const { rows } = await pool.query(
      'SELECT password_hash FROM system_users WHERE id = $1',
      [req.user.id]
    );
    const valid = await bcrypt.compare(currentPassword, rows[0]?.password_hash || '');
    if (!valid) return reply.code(401).send({ error: 'Senha atual incorreta' });

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE system_users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    return { ok: true };
  });
}

module.exports = authRoutes;
