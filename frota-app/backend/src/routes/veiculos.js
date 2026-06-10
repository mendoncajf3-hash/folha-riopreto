const router = require('express').Router();
const { query } = require('../db');
const { autenticar, apenasGestor } = require('../middleware/auth');

router.get('/', autenticar, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM veiculos ORDER BY modelo');
    res.json(rows);
  } catch {
    res.status(500).json({ erro: 'Erro ao buscar veículos.' });
  }
});

router.get('/disponiveis', autenticar, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT v.* FROM veiculos v
      WHERE v.ativo = true
        AND v.id NOT IN (
          SELECT veiculo_id FROM vistorias WHERE status = 'em_uso'
        )
      ORDER BY v.modelo
    `);
    res.json(rows);
  } catch {
    res.status(500).json({ erro: 'Erro ao buscar veículos disponíveis.' });
  }
});

router.get('/:id/historico', autenticar, async (req, res) => {
  try {
    const { rows: veiculo } = await query('SELECT * FROM veiculos WHERE id = $1', [req.params.id]);
    if (!veiculo[0]) return res.status(404).json({ erro: 'Veículo não encontrado.' });

    const { rows: vistorias } = await query(`
      SELECT v.*,
        json_build_object('nome', c.nome, 'matricula', c.matricula) as colaboradores,
        COALESCE(json_agg(DISTINCT ca.*) FILTER (WHERE ca.id IS NOT NULL), '[]') as checklist_avarias,
        COALESCE(json_agg(DISTINCT fv.*) FILTER (WHERE fv.id IS NOT NULL), '[]') as fotos_vistoria
      FROM vistorias v
      LEFT JOIN colaboradores c ON c.id = v.colaborador_id
      LEFT JOIN checklist_avarias ca ON ca.vistoria_id = v.id
      LEFT JOIN fotos_vistoria fv ON fv.vistoria_id = v.id
      WHERE v.veiculo_id = $1
      GROUP BY v.id, c.nome, c.matricula
      ORDER BY v.criado_em DESC
    `, [req.params.id]);

    res.json({ veiculo: veiculo[0], vistorias });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao buscar histórico.' });
  }
});

router.post('/', autenticar, apenasGestor, async (req, res) => {
  const { placa, modelo, marca, ano, cor } = req.body;
  if (!placa || !modelo || !marca) return res.status(400).json({ erro: 'Placa, modelo e marca obrigatórios.' });
  try {
    const { rows } = await query(
      'INSERT INTO veiculos (placa, modelo, marca, ano, cor) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [placa.toUpperCase(), modelo, marca, ano || null, cor || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ erro: 'Placa já cadastrada.' });
    res.status(500).json({ erro: 'Erro ao cadastrar veículo.' });
  }
});

router.patch('/:id/status', autenticar, apenasGestor, async (req, res) => {
  try {
    const { rows } = await query(
      'UPDATE veiculos SET ativo = NOT ativo WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    res.json(rows[0]);
  } catch {
    res.status(500).json({ erro: 'Erro ao atualizar veículo.' });
  }
});

module.exports = router;
