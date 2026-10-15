import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Relatorio from './pages/Relatorio';
import Veiculos from './pages/Veiculos';
import Colaboradores from './pages/Colaboradores';
import HistoricoVeiculo from './pages/HistoricoVeiculo';

const tema = createTheme({
  palette: {
    primary: { main: '#1565C0' },
    secondary: { main: '#42a5f5' },
  },
  typography: { fontFamily: 'Inter, Roboto, sans-serif' },
});

function Rotas() {
  const { autenticado } = useAuth();
  if (!autenticado) return <Login />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/relatorio" element={<Relatorio />} />
        <Route path="/veiculos" element={<Veiculos />} />
        <Route path="/veiculos/:id" element={<HistoricoVeiculo />} />
        <Route path="/colaboradores" element={<Colaboradores />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={tema}>
      <CssBaseline />
      <BrowserRouter>
        <Rotas />
      </BrowserRouter>
    </ThemeProvider>
  );
}
