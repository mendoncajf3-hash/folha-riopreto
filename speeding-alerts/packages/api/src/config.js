require('dotenv').config();

const config = {
  port:     parseInt(process.env.API_PORT || '3009'),
  nodeEnv:  process.env.NODE_ENV || 'development',
  isDev:    (process.env.NODE_ENV || 'development') === 'development',

  jwt: {
    secret:         process.env.JWT_SECRET || 'dev_secret_change_in_production',
    expiresIn:      process.env.JWT_EXPIRES_IN || '8h',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:5173', 'http://localhost:3009'],
  },

  redis: {
    host:     process.env.REDIS_HOST || 'localhost',
    port:     parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },

  legacy: {
    dbPath: process.env.LEGACY_DB_PATH || null,
  },
};

if (config.jwt.secret === 'dev_secret_change_in_production' && !config.isDev) {
  throw new Error('JWT_SECRET must be set in production');
}

module.exports = config;
