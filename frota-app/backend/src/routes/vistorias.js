const router = require('express').Router();
const { query } = require('../db');
const { autenticar, apenasGestor } = require('../middleware/auth');

// Iniciar vistoria (retirada)
router.post('/', autenticar, async (req, res) => {
  const { veiculo_id, km_retirada } = req.body;
  if (!veiculo_id || !km_retirada) return res.status(400).json({ erro: 'Veículo e KM obrigatórios.' });

  try {
    // Verifica se o veículo já está em uso
    const { rows: emUso } = await query(
      "SELECT id FROM vistorias WHERE veiculo_id = $1 AND status = 'em_uso'",
      [veiculo_id]
    );
    if (emUso.length > 0) return res.status(409).json({ erro: 'Veículo já está em uso.' });

    const { rows } = await query(
      `INSERT INTO vistorias (veiculo_id, colaborador_id, km_retirada)
       VALUES ($1, $2, $3) RETURNING *`,
      [veiculo_id, req.usuario.id, km_retirada]
    );
    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ erro: 'Erro ao iniciar vistoria.' });
  }
});

// Listar vistorias (gestor) com filtros
router.get('/', autenticar, apenasGestor, async (req, res) => {
  const { veiculo_id, colaborador_id, status, de, ate } = req.query;
  try {
    let filtros = [];
    let params = [];
    let i = 1;

    if (veiculo_id) { filtros.push(`v.veiculo_id = $${i++}`); params.push(veiculo_id); }
    if (colaborador_id) { filtros.push(`v.colaborador_id = $${i++}`); params.push(colaborador_id); }
    if (status) { filtros.push(`v.status = $${i++}`); params.push(status); }
    if (de) { filtros.push(`v.data_retirada >= $${i++}`); params.push(de); }
    if (ate) { filtros.push(`v.data_retirada <= $${i++}`); params.push(ate + 'T23:59:59'); }

    const where = filtros.length > 0 ? `WHERE ${filtros.join(' AND ')}` : '';

    const { rows } = await query(`
      SELECT v.*,
        json_build_object('id', ve.id, 'placa', ve.placa, 'modelo', ve.modelo, 'marca', ve.marca) as veiculos,
        json_build_object('id', c.id, 'nome', c.nome, 'matricula', c.matricula) as colaboradores
      FROM vistorias v
      LEFT JOIN veiculos ve ON ve.id = v.veiculo_id
      LEFT JOIN colaboradores c ON c.id = v.colaborador_id
      ${where}
      ORDER BY v.criado_em DESC
      LIMIT 200
    `, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao buscar vistorias.' });
  }
});

// Histórico do colaborador logado
router.get('/meu-historico', autenticar, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT v.*,
        json_build_object('placa', ve.placa, 'modelo', ve.modelo, 'marca', ve.marca) as veiculos
      FROM vistorias v
      LEFT JOIN veiculos ve ON ve.id = v.veiculo_id
      WHERE v.colaborador_id = $1
      ORDER BY v.criado_em DESC
    `, [req.usuario.id]);
    res.json(rows);
  } catch {
    res.status(500).json({ erro: 'Erro ao buscar histórico.' });
  }
});

// Detalhes de uma vistoria (fotos + checklist)
router.get('/:id', autenticar, async (req, res) => {
  try {
    const { rows: vis } = await query('SELECT * FROM vistorias WHERE id = $1', [req.params.id]);
    if (!vis[0]) return res.status(404).json({ erro: 'Vistoria não encontrada.' });

    if (vis[0].colaborador_id !== req.usuario.id && req.usuario.perfil !== 'gestor') {
      return res.status(403).json({ erro: 'Sem permissão.' });
    }

    const [{ rows: fotos }, { rows: checklist }] = await Promise.all([
      query('SELECT * FROM fotos_vistoria WHERE vistoria_id = $1 ORDER BY momento', [req.params.id]),
      query('SELECT * FROM checklist_avarias WHERE vistoria_id = $1 ORDER BY momento', [req.params.id]),
    ]);

    res.json({ ...vis[0], fotos, checklist });
  } catch {
    res.status(500).json({ erro: 'Erro ao buscar vistoria.' });
  }
});

// Salvar checklist
router.post('/:id/checklist', autenticar, async (req, res) => {
  const { momento, itens } = req.body;
  if (!momento || !itens) return res.status(400).json({ erro: 'Dados incompletos.' });
  try {
    const valores = itens.map((item) => [req.params.id, momento, item.nome, item.avariado, item.descricao || null]);
    for (const v of valores) {
      await query(
        'INSERT INTO checklist_avarias (vistoria_id, momento, item, avariado, descricao) VALUES ($1,$2,$3,$4,$5)',
        v
      );
    }
    res.json({ mensagem: 'Checklist salvo.' });
  } catch {
    res.status(500).json({ erro: 'Erro ao salvar checklist.' });
  }
});

// Atualizar vistoria (assinatura, km devolução, status)
router.patch('/:id', autenticar, async (req, res) => {
  const { assinatura_retirada, assinatura_devolucao, km_devolucao, observacao_devolucao, status } = req.body;
  try {
    const campos = [];
    const params = [];
    let i = 1;

    if (assinatura_retirada) { campos.push(`assinatura_retirada = $${i++}`); params.push(assinatura_retirada); }
    if (assinatura_devolucao) { campos.push(`assinatura_devolucao = $${i++}`); params.push(assinatura_devolucao); }
    if (km_devolucao) { campos.push(`km_devolucao = $${i++}`); params.push(km_devolucao); }
    if (observacao_devolucao !== undefined) { campos.push(`observacao_devolucao = $${i++}`); params.push(observacao_devolucao); }
    if (status) {
      campos.push(`status = $${i++}`); params.push(status);
      if (status === 'devolvido') { campos.push(`data_devolucao = $${i++}`); params.push(new Date().toISOString()); }
    }

    if (campos.length === 0) return res.status(400).json({ erro: 'Nenhum campo para atualizar.' });

    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE vistorias SET ${campos.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );
    res.json(rows[0]);
  } catch {
    res.status(500).json({ erro: 'Erro ao atualizar vistoria.' });
  }
});

module.exports = router;
