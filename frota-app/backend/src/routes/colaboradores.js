const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { autenticar, apenasGestor } = require('../middleware/auth');

router.get('/', autenticar, apenasGestor, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, nome, email, matricula, cargo, perfil, ativo, criado_em FROM colaboradores ORDER BY nome'
    );
    res.json(rows);
  } catch {
    res.status(500).json({ erro: 'Erro ao buscar colaboradores.' });
  }
});

router.post('/', autenticar, apenasGestor, async (req, res) => {
  const { nome, email, matricula, cargo, perfil } = req.body;
  if (!nome || !email || !matricula) return res.status(400).json({ erro: 'Nome, e-mail e matrícula obrigatórios.' });
  try {
    // senha inicial = matrícula
    const senha_hash = await bcrypt.hash(matricula, 10);
    const { rows } = await query(
      `INSERT INTO colaboradores (nome, email, matricula, cargo, perfil, senha_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nome, email, matricula, cargo, perfil, ativo`,
      [nome, email.toLowerCase(), matricula, cargo || null, perfil || 'colaborador', senha_hash]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ erro: 'E-mail ou matrícula já cadastrados.' });
    res.status(500).json({ erro: 'Erro ao cadastrar colaborador.' });
  }
});

router.patch('/:id/status', autenticar, apenasGestor, async (req, res) => {
  try {
    const { rows } = await query(
      'UPDATE colaboradores SET ativo = NOT ativo WHERE id = $1 RETURNING id, nome, ativo',
      [req.params.id]
    );
    res.json(rows[0]);
  } catch {
    res.status(500).json({ erro: 'Erro ao atualizar colaborador.' });
  }
});

router.patch('/:id/senha', autenticar, async (req, res) => {
  if (req.usuario.id !== req.params.id && req.usuario.perfil !== 'gestor') {
    return res.status(403).json({ erro: 'Sem permissão.' });
  }
  const { senha_atual, nova_senha } = req.body;
  try {
    const { rows } = await query('SELECT senha_hash FROM colaboradores WHERE id = $1', [req.params.id]);
    const ok = await bcrypt.compare(senha_atual, rows[0].senha_hash);
    if (!ok) return res.status(401).json({ erro: 'Senha atual incorreta.' });
    const hash = await bcrypt.hash(nova_senha, 10);
    await query('UPDATE colaboradores SET senha_hash = $1 WHERE id = $2', [hash, req.params.id]);
    res.json({ mensagem: 'Senha atualizada.' });
  } catch {
    res.status(500).json({ erro: 'Erro ao alterar senha.' });
  }
});

module.exports = router;
