require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool } = require('./db');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rotas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/veiculos', require('./routes/veiculos'));
app.use('/api/colaboradores', require('./routes/colaboradores'));
app.use('/api/vistorias', require('./routes/vistorias'));
app.use('/api/vistorias', require('./routes/uploads'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', hora: new Date().toISOString() }));

async function iniciar() {
  // Aguarda o banco subir (Docker Compose)
  let tentativas = 0;
  while (tentativas < 10) {
    try {
      await pool.query('SELECT 1');
      break;
    } catch {
      tentativas++;
      console.log(`Aguardando banco... tentativa ${tentativas}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Executa o schema SQL
  const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Banco de dados pronto.');

  app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
}

iniciar().catch((e) => { console.error(e); process.exit(1); });
