const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const session = require('express-session');

const app = express();
const PORT = 3001;
const DB_FILE = path.join(__dirname, 'database.json');
const USERS_FILE = path.join(__dirname, 'users.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'lec_riopreto_2026_secret_xk9',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 } // 8 horas
}));

// SHA-256
function hashSenha(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

// Inicializar usuários
function initUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    const users = {
      'jefferson': { pwd: hashSenha('lec2024'),     name: 'Jefferson', role: 'ADMIN',    ativo: true },
      'daniel':    { pwd: hashSenha('da@lec31847'), name: 'Daniel',    role: 'OPERADOR', ativo: true },
      'fernando':  { pwd: hashSenha('ft@lec54233'), name: 'Fernando',  role: 'OPERADOR', ativo: true },
      'luan':      { pwd: hashSenha('lh@lec72619'), name: 'Luan',      role: 'OPERADOR', ativo: true }
    };
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log('Usuários inicializados.');
  }
}

function getUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }
  catch(e) { return {}; }
}

function getDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch(e) { return { cadastro: [], eventos: [], calendario: {}, config: {} }; }
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ── ROTAS DE AUTENTICAÇÃO ──────────────────────────────

// Login
app.post('/api/login', (req, res) => {
  const { usuario, senha } = req.body;
  if (!usuario || !senha) return res.json({ ok: false, erro: 'Preencha usuário e senha' });

  const users = getUsers();
  const user = users[usuario.toLowerCase()];
  if (!user || !user.ativo) return res.json({ ok: false, erro: 'Usuário ou senha incorretos' });
  if (user.pwd !== hashSenha(senha)) return res.json({ ok: false, erro: 'Usuário ou senha incorretos' });

  req.session.usuario = usuario.toLowerCase();
  req.session.role = user.role;
  req.session.name = user.name;

  console.log(`[LOGIN] ${user.name} - ${new Date().toLocaleString('pt-BR')}`);
  res.json({ ok: true, user: { usuario: usuario.toLowerCase(), role: user.role, name: user.name } });
});

// Verificar sessão ativa
app.get('/api/me', (req, res) => {
  if (!req.session.usuario) return res.json({ user: null });
  const users = getUsers();
  const user = users[req.session.usuario];
  if (!user || !user.ativo) { req.session.destroy(); return res.json({ user: null }); }
  res.json({ user: { usuario: req.session.usuario, role: req.session.role, name: req.session.name } });
});

// Logout
app.post('/api/logout', (req, res) => {
  console.log(`[LOGOUT] ${req.session.name || '?'} - ${new Date().toLocaleString('pt-BR')}`);
  req.session.destroy();
  res.json({ ok: true });
});

// ── ROTAS DE DADOS ──────────────────────────────────────

// Middleware de autenticação
function auth(req, res, next) {
  if (!req.session.usuario) return res.status(401).json({ erro: 'Não autenticado' });
  next();
}

// Carregar dados
app.get('/api/data', auth, (req, res) => {
  res.json(getDB());
});

// Salvar dados
app.post('/api/save', auth, (req, res) => {
  try {
    const data = req.body;
    saveDB(data);
    console.log(`[SAVE] ${req.session.name} - ${new Date().toLocaleString('pt-BR')}`);
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ erro: 'Erro ao salvar' });
  }
});

// ── ADMIN: gerenciar usuários ────────────────────────────

// Listar usuários (apenas admin)
app.get('/api/users', auth, (req, res) => {
  if (req.session.role !== 'ADMIN') return res.status(403).json({ erro: 'Acesso negado' });
  const users = getUsers();
  // Não retornar senhas
  const safe = {};
  Object.entries(users).forEach(([k, v]) => { safe[k] = { name: v.name, role: v.role, ativo: v.ativo }; });
  res.json(safe);
});

// Adicionar/editar usuário
app.post('/api/users', auth, (req, res) => {
  if (req.session.role !== 'ADMIN') return res.status(403).json({ erro: 'Acesso negado' });
  const { login, senha, name, role, ativo } = req.body;
  if (!login || !name) return res.json({ ok: false, erro: 'Login e nome obrigatórios' });
  const users = getUsers();
  users[login.toLowerCase()] = {
    pwd: senha ? hashSenha(senha) : (users[login.toLowerCase()]?.pwd || hashSenha('lec@2024')),
    name, role: role || 'OPERADOR', ativo: ativo !== false
  };
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.json({ ok: true });
});

// Remover usuário
app.delete('/api/users/:login', auth, (req, res) => {
  if (req.session.role !== 'ADMIN') return res.status(403).json({ erro: 'Acesso negado' });
  if (req.params.login === req.session.usuario) return res.json({ ok: false, erro: 'Não pode remover o próprio usuário' });
  const users = getUsers();
  delete users[req.params.login];
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.json({ ok: true });
});

// ── START ────────────────────────────────────────────────
initUsers();
app.listen(PORT, () => {
  console.log(`✅ Sistema LEC - S. José do Rio Preto rodando na porta ${PORT}`);
  console.log(`   Acesso: http://2.24.97.244:${PORT}`);
});
