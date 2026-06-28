require('dotenv').config();
const Fastify    = require('fastify');
const cors       = require('@fastify/cors');
const helmet     = require('@fastify/helmet');
const rateLimit  = require('@fastify/rate-limit');
const config     = require('./config');
const authPlugin = require('./plugins/auth');
const { runMigrations } = require('./db/migrate');

// Rotas
const authRoutes      = require('./routes/auth');
const employeeRoutes  = require('./routes/employees');
const vehicleRoutes   = require('./routes/vehicles');
const baseRoutes      = require('./routes/bases');
const alertRoutes     = require('./routes/alerts');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes     = require('./routes/admin');

const fastify = Fastify({
  logger: {
    level: config.isDev ? 'info' : 'warn',
    transport: config.isDev
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
      : undefined,
  },
});

// ── PLUGINS ───────────────────────────────────────────────────────

fastify.register(helmet, {
  contentSecurityPolicy: false,
});

fastify.register(cors, {
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

fastify.register(rateLimit, {
  max: 200,
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({ error: 'Muitas requisições. Tente em instantes.' }),
});

fastify.register(authPlugin);

// ── SSE (Server-Sent Events para dashboard em tempo real) ─────────
const sseClients = new Set();

fastify.decorate('sse', {
  emit(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    sseClients.forEach(res => {
      try { res.raw.write(payload); } catch { sseClients.delete(res); }
    });
  },
});

fastify.get('/api/events', { preHandler: fastify.authenticate }, (req, reply) => {
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.setHeader('X-Accel-Buffering', 'no');
  reply.raw.write('event: connected\ndata: {}\n\n');

  sseClients.add(reply);

  const heartbeat = setInterval(() => {
    try { reply.raw.write(': ping\n\n'); }
    catch { clearInterval(heartbeat); sseClients.delete(reply); }
  }, 25000);

  req.raw.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(reply);
  });

  return reply;
});

// ── ROTAS ─────────────────────────────────────────────────────────

fastify.register(authRoutes,      { prefix: '/api/auth' });
fastify.register(employeeRoutes,  { prefix: '/api/employees' });
fastify.register(vehicleRoutes,   { prefix: '/api/vehicles' });
fastify.register(baseRoutes,      { prefix: '/api/bases' });
fastify.register(alertRoutes,     { prefix: '/api/alerts' });
fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
fastify.register(adminRoutes,     { prefix: '/api/admin' });

// Health check
fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// ── GRACEFUL SHUTDOWN ─────────────────────────────────────────────

const shutdown = async (signal) => {
  fastify.log.info(`[${signal}] Encerrando servidor...`);
  await fastify.close();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── START ─────────────────────────────────────────────────────────

async function start() {
  try {
    await runMigrations();
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    fastify.log.info(`Servidor iniciado na porta ${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
