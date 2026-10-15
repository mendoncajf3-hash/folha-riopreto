import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Chip, Divider, Grid, Button,
  Accordion, AccordionSummary, AccordionDetails, Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const LABELS_ANGULO = {
  frente: 'Frente', traseira: 'Traseira',
  lateral_esquerda: 'Lado Esq.', lateral_direita: 'Lado Dir.',
};

export default function HistoricoVeiculo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [veiculo, setVeiculo] = useState(null);
  const [vistorias, setVistorias] = useState([]);

  useEffect(() => {
    async function carregar() {
      const { data: v } = await supabase.from('veiculos').select('*').eq('id', id).single();
      setVeiculo(v);

      const { data: vis } = await supabase
        .from('vistorias')
        .select(`
          id, status, km_retirada, km_devolucao, data_retirada, data_devolucao,
          observacao_devolucao,
          colaboradores(nome, matricula),
          checklist_avarias(*),
          fotos_vistoria(*)
        `)
        .eq('veiculo_id', id)
        .order('criado_em', { ascending: false });
      setVistorias(vis || []);
    }
    carregar();
  }, [id]);

  function danoNovo(checklist) {
    const saida = new Set(checklist.filter((c) => c.momento === 'retirada' && c.avariado).map((c) => c.item));
    return checklist.filter((c) => c.momento === 'devolucao' && c.avariado && !saida.has(c.item));
  }

  if (!veiculo) return null;

  return (
    <Box sx={{ p: 3 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/veiculos')} sx={{ mb: 2 }}>
        Voltar
      </Button>

      <Paper sx={{ p: 3, mb: 3, borderLeft: '4px solid #1565C0' }}>
        <Typography variant="h5" fontWeight="bold" color="primary">
          {veiculo.placa}
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {veiculo.marca} {veiculo.modelo} • {veiculo.cor} • {veiculo.ano}
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          {vistorias.length} vistoria(s) registrada(s)
        </Typography>
      </Paper>

      {vistorias.length === 0 && (
        <Alert severity="info">Nenhuma vistoria registrada para este veículo.</Alert>
      )}

      {vistorias.map((v) => {
        const novos = danoNovo(v.checklist_avarias);
        const avariasSaida = v.checklist_avarias.filter((c) => c.momento === 'retirada' && c.avariado);
        const kmPercorrido = v.km_devolucao ? v.km_devolucao - v.km_retirada : null;

        return (
          <Accordion key={v.id} defaultExpanded={false} sx={{ mb: 1, borderRadius: '8px !important', '&:before': { display: 'none' } }} elevation={2}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', width: '100%' }}>
                <Box>
                  <Typography fontWeight="bold">
                    {new Date(v.data_retirada).toLocaleDateString('pt-BR')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {v.colaboradores?.nome} — Mat. {v.colaboradores?.matricula}
                  </Typography>
                </Box>
                <Box sx={{ ml: 'auto', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {novos.length > 0 && (
                    <Chip
                      icon={<NewReleasesIcon />}
                      label={`${novos.length} dano(s) novo(s)`}
                      color="error"
                      size="small"
                    />
                  )}
                  <Chip
                    label={v.status === 'em_uso' ? 'Em Uso' : 'Devolvido'}
                    color={v.status === 'em_uso' ? 'warning' : 'success'}
                    size="small"
                  />
                </Box>
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              {/* Danos Novos — destaque */}
              {novos.length > 0 && (
                <Alert severity="error" icon={<NewReleasesIcon />} sx={{ mb: 2 }}>
                  <Typography fontWeight="bold" mb={0.5}>Danos identificados na devolução:</Typography>
                  {novos.map((d) => (
                    <Box key={d.id}>• {d.item}{d.descricao ? ` — ${d.descricao}` : ''}</Box>
                  ))}
                </Alert>
              )}

              {/* KM */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">KM Saída</Typography>
                  <Typography fontWeight="bold">{v.km_retirada} km</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">KM Volta</Typography>
                  <Typography fontWeight="bold">{v.km_devolucao ? `${v.km_devolucao} km` : '–'}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Percorrido</Typography>
                  <Typography fontWeight="bold" color={kmPercorrido > 200 ? 'warning.main' : 'text.primary'}>
                    {kmPercorrido != null ? `${kmPercorrido} km` : '–'}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ mb: 2 }} />

              {/* Fotos comparação */}
              <Typography variant="subtitle2" fontWeight="bold" mb={1}>Fotos — Saída vs Volta</Typography>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {Object.keys(LABELS_ANGULO).map((ang) => {
                  const fSaida = v.fotos_vistoria.find((f) => f.momento === 'retirada' && f.angulo === ang);
                  const fVolta = v.fotos_vistoria.find((f) => f.momento === 'devolucao' && f.angulo === ang);
                  return (
                    <Grid item xs={6} sm={3} key={ang}>
                      <Typography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                        {LABELS_ANGULO[ang]}
                      </Typography>
                      <Grid container spacing={0.5}>
                        <Grid item xs={6}>
                          {fSaida ? (
                            <Box component="a" href={fSaida.url} target="_blank" display="block">
                              <Box component="img" src={fSaida.url} sx={{ width: '100%', borderRadius: 1, border: '2px solid #42a5f5' }} />
                              <Typography variant="caption" color="primary">Saída</Typography>
                            </Box>
                          ) : (
                            <Box sx={{ height: 60, bgcolor: '#e0e0e0', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Typography variant="caption" color="text.disabled">–</Typography>
                            </Box>
                          )}
                        </Grid>
                        <Grid item xs={6}>
                          {fVolta ? (
                            <Box component="a" href={fVolta.url} target="_blank" display="block">
                              <Box component="img" src={fVolta.url} sx={{ width: '100%', borderRadius: 1, border: '2px solid #ef5350' }} />
                              <Typography variant="caption" color="error">Volta</Typography>
                            </Box>
                          ) : (
                            <Box sx={{ height: 60, bgcolor: '#fce4ec', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Typography variant="caption" color="text.disabled">–</Typography>
                            </Box>
                          )}
                        </Grid>
                      </Grid>
                    </Grid>
                  );
                })}
              </Grid>

              <Divider sx={{ mb: 2 }} />

              {/* Checklist saída */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight="bold" color="primary" mb={1}>
                    Avarias na Saída
                  </Typography>
                  {avariasSaida.length === 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckCircleOutlineIcon sx={{ color: 'success.main', fontSize: 18 }} />
                      <Typography variant="body2" color="success.main">Nenhuma avaria</Typography>
                    </Box>
                  ) : avariasSaida.map((c) => (
                    <Box key={c.id} sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                      <WarningAmberIcon sx={{ color: 'warning.main', fontSize: 16, mt: 0.2 }} />
                      <Box>
                        <Typography variant="body2">{c.item}</Typography>
                        {c.descricao && <Typography variant="caption" color="text.secondary">{c.descricao}</Typography>}
                      </Box>
                    </Box>
                  ))}
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight="bold" color="error" mb={1}>
                    Avarias na Volta
                  </Typography>
                  {v.status !== 'devolvido' ? (
                    <Typography variant="body2" color="text.secondary">Veículo ainda não devolvido</Typography>
                  ) : novos.length === 0 && v.checklist_avarias.filter((c) => c.momento === 'devolucao' && c.avariado).length === 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckCircleOutlineIcon sx={{ color: 'success.main', fontSize: 18 }} />
                      <Typography variant="body2" color="success.main">Nenhuma avaria nova</Typography>
                    </Box>
                  ) : (
                    novos.map((c) => (
                      <Box key={c.id} sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                        <NewReleasesIcon sx={{ color: 'error.main', fontSize: 16, mt: 0.2 }} />
                        <Box>
                          <Typography variant="body2" color="error.main" fontWeight="bold">{c.item}</Typography>
                          {c.descricao && <Typography variant="caption" color="text.secondary">{c.descricao}</Typography>}
                        </Box>
                      </Box>
                    ))
                  )}
                </Grid>
              </Grid>

              {v.observacao_devolucao && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: '#fff9c4', borderRadius: 1 }}>
                  <Typography variant="caption" fontWeight="bold">Observação:</Typography>
                  <Typography variant="body2">{v.observacao_devolucao}</Typography>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
