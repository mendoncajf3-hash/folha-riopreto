import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Relatorio from './pages/Relatorio';
import Veiculos from './pages/Veiculos';
import Colaboradores from './pages/Colaboradores';

const tema = createTheme({
  palette: {
    primary: { main: '#1565C0' },
    secondary: { main: '#42a5f5' },
  },
  typography: { fontFamily: 'Inter, Roboto, sans-serif' },
});

export default function App() {
  return (
    <ThemeProvider theme={tema}>
      <CssBaseline />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/relatorio" element={<Relatorio />} />
            <Route path="/veiculos" element={<Veiculos />} />
            <Route path="/colaboradores" element={<Colaboradores />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}
