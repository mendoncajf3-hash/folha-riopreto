import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert } from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import { supabase } from '../services/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) setErro('E-mail ou senha incorretos.');
    setCarregando(false);
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1565C0' }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 380, borderRadius: 3 }} elevation={8}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <DirectionsCarIcon sx={{ fontSize: 52, color: '#1565C0' }} />
          <Typography variant="h5" fontWeight="bold" color="primary">Frota App</Typography>
          <Typography variant="body2" color="text.secondary">Painel do Gestor</Typography>
        </Box>

        {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

        <Box component="form" onSubmit={entrar}>
          <TextField
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            autoFocus
          />
          <TextField
            label="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            loading={carregando}
            disabled={!email || !senha || carregando}
          >
            Entrar
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
