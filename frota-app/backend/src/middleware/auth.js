const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ erro: 'Token não fornecido.' });

  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ erro: 'Token inválido.' });

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ erro: 'Token expirado ou inválido.' });
  }
}

function apenasGestor(req, res, next) {
  if (req.usuario?.perfil !== 'gestor') {
    return res.status(403).json({ erro: 'Acesso restrito ao gestor.' });
  }
  next();
}

module.exports = { autenticar, apenasGestor };
