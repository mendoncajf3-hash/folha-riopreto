import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { supabase } from '../services/supabase';

const VAZIO = { nome: '', email: '', matricula: '', cargo: '' };

export default function Colaboradores() {
  const [colaboradores, setColaboradores] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const { data } = await supabase.from('colaboradores').select('*').order('nome');
    setColaboradores(data || []);
  }

  useEffect(() => { carregar(); }, []);

  function abrir() { setForm(VAZIO); setAberto(true); }
  function fechar() { setAberto(false); }

  async function salvar() {
    if (!form.nome || !form.email || !form.matricula) return;
    setSalvando(true);
    const { error: authError } = await supabase.auth.admin.createUser({
      email: form.email,
      password: form.matricula,
      email_confirm: true,
    });
    if (!authError) {
      await supabase.from('colaboradores').insert(form);
    }
    await carregar();
    setSalvando(false);
    fechar();
  }

  async function toggleAtivo(colab) {
    await supabase.from('colaboradores').update({ ativo: !colab.ativo }).eq('id', colab.id);
    carregar();
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" color="primary">Colaboradores</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={abrir}>Novo Colaborador</Button>
      </Box>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell><b>Nome</b></TableCell>
              <TableCell><b>E-mail</b></TableCell>
              <TableCell><b>Matrícula</b></TableCell>
              <TableCell><b>Cargo</b></TableCell>
              <TableCell><b>Status</b></TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {colaboradores.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell><b>{c.nome}</b></TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{c.matricula}</TableCell>
                <TableCell>{c.cargo || '–'}</TableCell>
                <TableCell>
                  <Chip label={c.ativo ? 'Ativo' : 'Inativo'} color={c.ativo ? 'success' : 'default'} size="small" />
                </TableCell>
                <TableCell>
                  <Button size="small" variant="outlined" color={c.ativo ? 'error' : 'success'}
                    onClick={() => toggleAtivo(c)}>
                    {c.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={aberto} onClose={fechar} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Colaborador</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {[
              { label: 'Nome completo *', key: 'nome' },
              { label: 'E-mail *', key: 'email' },
              { label: 'Matrícula *', key: 'matricula' },
              { label: 'Cargo', key: 'cargo' },
            ].map(({ label, key }) => (
              <Grid item xs={12} key={key}>
                <TextField
                  label={label}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  fullWidth size="small"
                />
              </Grid>
            ))}
          </Grid>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            * A senha inicial será a matrícula do colaborador
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={fechar}>Cancelar</Button>
          <Button variant="contained" onClick={salvar} disabled={salvando}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
