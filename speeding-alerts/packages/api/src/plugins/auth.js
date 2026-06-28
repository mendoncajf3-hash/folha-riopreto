const fp      = require('fastify-plugin');
const jwt     = require('@fastify/jwt');
const config  = require('../config');

async function authPlugin(fastify) {
  fastify.register(jwt, {
    secret: config.jwt.secret,
    sign:   { expiresIn: config.jwt.expiresIn },
  });

  fastify.decorate('authenticate', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Token inválido ou expirado' });
    }
  });

  fastify.decorate('requireRole', (roles) => async (req, reply) => {
    try {
      await req.jwtVerify();
      if (!roles.includes(req.user.role)) {
        reply.code(403).send({ error: 'Acesso negado' });
      }
    } catch (err) {
      reply.code(401).send({ error: 'Token inválido ou expirado' });
    }
  });
}

module.exports = fp(authPlugin);
