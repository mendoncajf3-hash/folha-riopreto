import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, Paper,
} from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleIcon from '@mui/icons-material/People';
import { supabase } from '../services/supabase';

export default function Dashboard() {
  const [stats, setStats] = useState({ emUso: 0, disponiveis: 0, avariaHoje: 0, total: 0 });
  const [ultimas, setUltimas] = useState([]);

  useEffect(() => {
    async function carregar() {
      const { data: vistorias } = await supabase
        .from('vistorias')
        .select('*, veiculos(placa, modelo), colaboradores(nome)')
        .order('criado_em', { ascending: false })
        .limit(10);

      const { count: emUso } = await supabase
        .from('vistorias')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'em_uso');

      const { count: totalVeiculos } = await supabase
        .from('veiculos')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true);

      setUltimas(vistorias || []);
      setStats({ emUso: emUso || 0, disponiveis: (totalVeiculos || 0) - (emUso || 0), total: totalVeiculos || 0 });
    }
    carregar();
  }, []);

  const cartoes = [
    { titulo: 'Em Uso', valor: stats.emUso, icone: <DirectionsCarIcon />, cor: '#1565C0' },
    { titulo: 'Disponíveis', valor: stats.disponiveis, icone: <CheckCircleIcon />, cor: '#2e7d32' },
    { titulo: 'Total de Veículos', valor: stats.total, icone: <PeopleIcon />, cor: '#6a1b9a' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" mb={3} color="primary">
        Painel de Frota
      </Typography>

      <Grid container spacing={2} mb={3}>
        {cartoes.map((c) => (
          <Grid item xs={12} sm={4} key={c.titulo}>
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ color: c.cor, fontSize: 40 }}>{c.icone}</Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color={c.cor}>{c.valor}</Typography>
                  <Typography variant="body2" color="text.secondary">{c.titulo}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" mb={2}>Últimas Vistorias</Typography>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell><b>Veículo</b></TableCell>
              <TableCell><b>Colaborador</b></TableCell>
              <TableCell><b>Data/Hora</b></TableCell>
              <TableCell><b>Status</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ultimas.map((v) => (
              <TableRow key={v.id} hover>
                <TableCell>{v.veiculos?.placa} — {v.veiculos?.modelo}</TableCell>
                <TableCell>{v.colaboradores?.nome}</TableCell>
                <TableCell>{new Date(v.criado_em).toLocaleString('pt-BR')}</TableCell>
                <TableCell>
                  <Chip
                    label={v.status === 'em_uso' ? 'Em Uso' : 'Devolvido'}
                    color={v.status === 'em_uso' ? 'warning' : 'success'}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
