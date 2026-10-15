const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'frota',
  user: process.env.DB_USER || 'frota',
  password: process.env.DB_PASSWORD,
});

pool.on('error', (err) => {
  console.error('Erro no pool PostgreSQL:', err);
});

module.exports = { query: (text, params) => pool.query(text, params), pool };
