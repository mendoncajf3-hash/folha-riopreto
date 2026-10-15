const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { query } = require('../db');
const { autenticar } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const nome = `${req.params.id}_${req.body.momento}_${req.body.angulo}_${Date.now()}.jpg`;
    cb(null, nome);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Apenas imagens são permitidas.'));
    cb(null, true);
  },
});

router.post('/:id/fotos', autenticar, upload.single('foto'), async (req, res) => {
  const { momento, angulo } = req.body;
  if (!momento || !angulo || !req.file) return res.status(400).json({ erro: 'Dados incompletos.' });

  const url = `/uploads/${req.file.filename}`;
  try {
    const { rows } = await query(
      'INSERT INTO fotos_vistoria (vistoria_id, momento, angulo, url) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, momento, angulo, url]
    );
    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ erro: 'Erro ao salvar foto.' });
  }
});

module.exports = router;
