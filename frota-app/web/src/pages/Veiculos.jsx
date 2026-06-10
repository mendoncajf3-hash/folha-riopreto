import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, IconButton, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import { supabase } from '../services/supabase';

const VAZIO = { placa: '', marca: '', modelo: '', ano: '', cor: '' };

export default function Veiculos() {
  const [veiculos, setVeiculos] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const { data } = await supabase.from('veiculos').select('*').order('modelo');
    setVeiculos(data || []);
  }

  useEffect(() => { carregar(); }, []);

  function abrir() { setForm(VAZIO); setAberto(true); }
  function fechar() { setAberto(false); }

  async function salvar() {
    if (!form.placa || !form.marca || !form.modelo) return;
    setSalvando(true);
    await supabase.from('veiculos').insert({
      placa: form.placa.toUpperCase(),
      marca: form.marca,
      modelo: form.modelo,
      ano: form.ano ? Number(form.ano) : null,
      cor: form.cor,
    });
    await carregar();
    setSalvando(false);
    fechar();
  }

  async function toggleAtivo(veiculo) {
    await supabase.from('veiculos').update({ ativo: !veiculo.ativo }).eq('id', veiculo.id);
    carregar();
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" color="primary">Veículos</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={abrir}>Novo Veículo</Button>
      </Box>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell><b>Placa</b></TableCell>
              <TableCell><b>Marca / Modelo</b></TableCell>
              <TableCell><b>Ano</b></TableCell>
              <TableCell><b>Cor</b></TableCell>
              <TableCell><b>Status</b></TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {veiculos.map((v) => (
              <TableRow key={v.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DirectionsCarIcon sx={{ color: '#1565C0', fontSize: 18 }} />
                    <b>{v.placa}</b>
                  </Box>
                </TableCell>
                <TableCell>{v.marca} {v.modelo}</TableCell>
                <TableCell>{v.ano || '–'}</TableCell>
                <TableCell>{v.cor || '–'}</TableCell>
                <TableCell>
                  <Chip
                    label={v.ativo ? 'Ativo' : 'Inativo'}
                    color={v.ativo ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title={v.ativo ? 'Desativar' : 'Ativar'}>
                    <Button size="small" variant="outlined" color={v.ativo ? 'error' : 'success'}
                      onClick={() => toggleAtivo(v)}>
                      {v.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={aberto} onClose={fechar} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Veículo</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {[
              { label: 'Placa *', key: 'placa' },
              { label: 'Marca *', key: 'marca' },
              { label: 'Modelo *', key: 'modelo' },
              { label: 'Ano', key: 'ano' },
              { label: 'Cor', key: 'cor' },
            ].map(({ label, key }) => (
              <Grid item xs={12} sm={key === 'placa' ? 6 : 12} key={key}>
                <TextField
                  label={label}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  fullWidth
                  size="small"
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={fechar}>Cancelar</Button>
          <Button variant="contained" onClick={salvar} disabled={salvando}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
