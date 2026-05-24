const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, 'db.json');
const BACKUPS_DIR = path.join(__dirname, 'backups');

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: 'folha-previa-secret-key',
  resave: false,
  saveUninitialized: true
}));

// Ensure backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// Load database
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    return { cadastro: [], eventos: [], config: {}, calendario: {}, usuarios: [] };
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

// Save database with backup
function saveDB(data, backupSuffix = 'auto') {
  try {
    // Auto backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `db_${timestamp}_${backupSuffix}.json`;
    const backupPath = path.join(BACKUPS_DIR, backupName);
    
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, backupPath);
    }
    
    // Keep only 30 backups
    const files = fs.readdirSync(BACKUPS_DIR).sort().reverse();
    if (files.length > 30) {
      files.slice(30).forEach(f => {
        fs.unlinkSync(path.join(BACKUPS_DIR, f));
      });
    }
    
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Erro ao salvar:', err.message);
    return false;
  }
}

// Login
app.post('/api/login', (req, res) => {
  const { usuario, senha } = req.body;
  if (!usuario || !senha) {
    return res.json({ ok: false, erro: 'Preencha usuário e senha' });
  }
  
  const db = loadDB();
  const user = db.usuarios?.find(u => u.usuario === usuario && u.senha === senha);
  
  if (!user) {
    return res.json({ ok: false, erro: 'Usuário ou senha inválidos' });
  }
  
  req.session.user = user;
  res.json({ ok: true, user });
});

// Save endpoint
app.post('/api/save', (req, res) => {
  if (!req.session.user) {
    return res.json({ ok: false, erro: 'Não autenticado' });
  }
  
  const data = req.body;
  if (saveDB(data)) {
    res.json({ ok: true });
  } else {
    res.json({ ok: false, erro: 'Erro ao salvar' });
  }
});

// Backups list
app.get('/api/backups/list', (req, res) => {
  if (!req.session.user) {
    return res.json({ backups: [] });
  }
  
  const files = fs.readdirSync(BACKUPS_DIR)
    .map(f => {
      const fullPath = path.join(BACKUPS_DIR, f);
      const stat = fs.statSync(fullPath);
      return {
        name: f,
        size: stat.size,
        date: stat.mtime.toISOString()
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  res.json({ backups: files });
});

// Download backup
app.get('/api/backups/download/:name', (req, res) => {
  if (!req.session.user) {
    return res.status(403).json({ erro: 'Não autenticado' });
  }
  
  const backupPath = path.join(BACKUPS_DIR, req.params.name);
  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ erro: 'Backup não encontrado' });
  }
  
  res.download(backupPath);
});

// Restore backup
app.post('/api/backups/restore/:name', (req, res) => {
  if (!req.session.user) {
    return res.json({ ok: false, erro: 'Não autenticado' });
  }
  
  const backupPath = path.join(BACKUPS_DIR, req.params.name);
  if (!fs.existsSync(backupPath)) {
    return res.json({ ok: false, erro: 'Backup não encontrado' });
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    saveDB(data, 'restore');
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, erro: err.message });
  }
});

// IA Lecsa endpoint
app.post('/api/ai', async (req, res) => {
  try {
    const { mensagem } = req.body;
    const genAI = new GoogleGenerativeAI('AIzaSyD3iHLLZ2mSCjI0_Rkp5YZcI3eJiPQ4l5k');
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
    
    const result = await model.generateContent(mensagem);
    const text = result.response.text();
    
    res.json({ ok: true, resposta: text });
  } catch (err) {
    res.json({ ok: false, erro: err.message });
  }
});

// Startup backup
if (!fs.existsSync(DB_PATH)) {
  const defaultDB = {
    cadastro: [],
    eventos: [],
    config: {
      competenciaAtual: '2026-05',
      competenciaProxima: '2026-06',
      base: 'S. JOSÉ DO RIO PRETO'
    },
    calendario: {},
    usuarios: [
      { usuario: 'jefferson', senha: 'lec2024', name: 'Jefferson', role: 'ADMIN' },
      { usuario: 'daniel', senha: 'lec@art123', name: 'Daniel', role: 'OPERADOR' },
      { usuario: 'fernando', senha: 'lec@fer#456', name: 'Fernando', role: 'OPERADOR' },
      { usuario: 'luan', senha: 'lec@luan#789', name: 'Luan', role: 'OPERADOR' }
    ]
  };
  saveDB(defaultDB, 'startup');
  console.log('Database inicializado');
} else {
  saveDB(loadDB(), 'startup');
}

// Start server
app.listen(PORT, () => {
  console.log(`Folha Previa rodando na porta ${PORT}`);
});
