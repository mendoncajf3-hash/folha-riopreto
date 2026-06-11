import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableHead,
  TableRow, Chip, MenuItem, Select, FormControl, InputLabel,
  TextField, IconButton, Collapse, Grid, Divider, Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { supabase } from '../services/supabase';

export default function Relatorio() {
  const [vistorias, setVistorias] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [filtroVeiculo, setFiltroVeiculo] = useState('');
  const [filtroColaborador, setFiltroColaborador] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroDe, setFiltroDe] = useState('');
  const [filtroAte, setFiltroAte] = useState('');
  const [expandido, setExpandido] = useState(null);
  const [detalhes, setDetalhes] = useState({});

  useEffect(() => {
    async function carregar() {
      const [{ data: v }, { data: c }, { data: vis }] = await Promise.all([
        supabase.from('veiculos').select('id, placa, modelo, marca').eq('ativo', true).order('modelo'),
        supabase.from('colaboradores').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('vistorias').select(`
          id, status, km_retirada, km_devolucao, data_retirada, data_devolucao,
          observacao_devolucao,
          veiculos(id, placa, modelo, marca),
          colaboradores(id, nome, matricula)
        `).order('criado_em', { ascending: false }).limit(200),
      ]);
      setVeiculos(v || []);
      setColaboradores(c || []);
      setVistorias(vis || []);
    }
    carregar();
  }, []);

  async function carregarDetalhes(vistoriaId) {
    if (detalhes[vistoriaId]) return;
    const [{ data: fotos }, { data: checklist }] = await Promise.all([
      supabase.from('fotos_vistoria').select('*').eq('vistoria_id', vistoriaId).order('momento'),
      supabase.from('checklist_avarias').select('*').eq('vistoria_id', vistoriaId).order('momento'),
    ]);
    setDetalhes((prev) => ({ ...prev, [vistoriaId]: { fotos: fotos || [], checklist: checklist || [] } }));
  }

  function toggleExpandir(id) {
    if (expandido === id) {
      setExpandido(null);
    } else {
      setExpandido(id);
      carregarDetalhes(id);
    }
  }

  const filtradas = vistorias.filter((v) => {
    if (filtroVeiculo && v.veiculos?.id !== filtroVeiculo) return false;
    if (filtroColaborador && v.colaboradores?.id !== filtroColaborador) return false;
    if (filtroStatus && v.status !== filtroStatus) return false;
    if (filtroDe && new Date(v.data_retirada) < new Date(filtroDe)) return false;
    if (filtroAte && new Date(v.data_retirada) > new Date(filtroAte + 'T23:59:59')) return false;
    return true;
  });

  const totalAvarias = (checklist, momento) =>
    checklist.filter((c) => c.momento === momento && c.avariado).length;

  const ANGULOS = ['frente', 'traseira', 'lateral_esquerda', 'lateral_direita'];
  const LABELS = { frente: 'Frente', traseira: 'Traseira', lateral_esquerda: 'Esq.', lateral_direita: 'Dir.' };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" mb={3} color="primary">
        Relatório de Vistorias
      </Typography>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" mb={2} color="text.secondary">Filtros</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Veículo</InputLabel>
              <Select value={filtroVeiculo} onChange={(e) => setFiltroVeiculo(e.target.value)} label="Veículo">
                <MenuItem value="">Todos</MenuItem>
                {veiculos.map((v) => (
                  <MenuItem key={v.id} value={v.id}>{v.placa} — {v.modelo}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Colaborador</InputLabel>
              <Select value={filtroColaborador} onChange={(e) => setFiltroColaborador(e.target.value)} label="Colaborador">
                <MenuItem value="">Todos</MenuItem>
                {colaboradores.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} label="Status">
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="em_uso">Em uso</MenuItem>
                <MenuItem value="devolvido">Devolvido</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField label="De" type="date" size="small" fullWidth InputLabelProps={{ shrink: true }}
              value={filtroDe} onChange={(e) => setFiltroDe(e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField label="Até" type="date" size="small" fullWidth InputLabelProps={{ shrink: true }}
              value={filtroAte} onChange={(e) => setFiltroAte(e.target.value)} />
          </Grid>
        </Grid>
        <Typography variant="caption" color="text.secondary" mt={1} display="block">
          {filtradas.length} registro(s) encontrado(s)
        </Typography>
      </Paper>

      {/* Tabela */}
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell />
              <TableCell><b>Veículo</b></TableCell>
              <TableCell><b>Colaborador</b></TableCell>
              <TableCell><b>Retirada</b></TableCell>
              <TableCell><b>Devolução</b></TableCell>
              <TableCell><b>KM percorrido</b></TableCell>
              <TableCell><b>Status</b></TableCell>
              <TableCell><b>Avarias</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtradas.map((v) => {
              const det = detalhes[v.id];
              const avariaRetirada = det ? totalAvarias(det.checklist, 'retirada') : '–';
              const avariaDevolucao = det ? totalAvarias(det.checklist, 'devolucao') : '–';
              const kmPercorrido = v.km_devolucao ? v.km_devolucao - v.km_retirada : null;
              const aberto = expandido === v.id;

              return (
                <React.Fragment key={v.id}>
                  <TableRow hover sx={{ '& td': { borderBottom: aberto ? 'none' : undefined } }}>
                    <TableCell>
                      <IconButton size="small" onClick={() => toggleExpandir(v.id)}>
                        {aberto ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <b>{v.veiculos?.placa}</b>
                      <br />
                      <Typography variant="caption" color="text.secondary">
                        {v.veiculos?.marca} {v.veiculos?.modelo}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {v.colaboradores?.nome}
                      <br />
                      <Typography variant="caption" color="text.secondary">
                        Mat. {v.colaboradores?.matricula}
                      </Typography>
                    </TableCell>
                    <TableCell>{new Date(v.data_retirada).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>{v.data_devolucao ? new Date(v.data_devolucao).toLocaleString('pt-BR') : '–'}</TableCell>
                    <TableCell>{kmPercorrido != null ? `${kmPercorrido} km` : '–'}</TableCell>
                    <TableCell>
                      <Chip
                        label={v.status === 'em_uso' ? 'Em Uso' : 'Devolvido'}
                        color={v.status === 'em_uso' ? 'warning' : 'success'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {det ? (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title={`Avarias na retirada: ${avariaRetirada}`}>
                            <Chip
                              icon={avariaRetirada > 0 ? <WarningAmberIcon /> : <CheckCircleOutlineIcon />}
                              label={`Saída: ${avariaRetirada}`}
                              color={avariaRetirada > 0 ? 'warning' : 'default'}
                              size="small"
                              variant="outlined"
                            />
                          </Tooltip>
                          {v.status === 'devolvido' && (
                            <Tooltip title={`Avarias na devolução: ${avariaDevolucao}`}>
                              <Chip
                                icon={avariaDevolucao > 0 ? <WarningAmberIcon /> : <CheckCircleOutlineIcon />}
                                label={`Volta: ${avariaDevolucao}`}
                                color={avariaDevolucao > 0 ? 'error' : 'success'}
                                size="small"
                                variant="outlined"
                              />
                            </Tooltip>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">Clique para ver</Typography>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Linha expandida */}
                  <TableRow>
                    <TableCell colSpan={8} sx={{ p: 0, border: 'none' }}>
                      <Collapse in={aberto} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2, backgroundColor: '#fafafa' }}>
                          {det ? (
                            <Grid container spacing={3}>
                              {/* Fotos */}
                              <Grid item xs={12}>
                                <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                                  Fotos — Comparação Saída vs Volta
                                </Typography>
                                <Grid container spacing={1}>
                                  {ANGULOS.map((ang) => {
                                    const fRet = det.fotos.find((f) => f.momento === 'retirada' && f.angulo === ang);
                                    const fDev = det.fotos.find((f) => f.momento === 'devolucao' && f.angulo === ang);
                                    return (
                                      <Grid item xs={6} sm={3} key={ang}>
                                        <Typography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                                          {LABELS[ang]}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                          {fRet ? (
                                            <Box component="a" href={fRet.url} target="_blank">
                                              <Box component="img" src={fRet.url} sx={{ width: '100%', borderRadius: 1, border: '2px solid #42a5f5' }} />
                                              <Typography variant="caption" color="primary">Saída</Typography>
                                            </Box>
                                          ) : (
                                            <Box sx={{ width: '100%', height: 80, bgcolor: '#e0e0e0', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                              <Typography variant="caption" color="text.disabled">Sem foto</Typography>
                                            </Box>
                                          )}
                                          {fDev ? (
                                            <Box component="a" href={fDev.url} target="_blank">
                                              <Box component="img" src={fDev.url} sx={{ width: '100%', borderRadius: 1, border: '2px solid #ef5350' }} />
                                              <Typography variant="caption" color="error">Volta</Typography>
                                            </Box>
                                          ) : (
                                            <Box sx={{ width: '100%', height: 80, bgcolor: '#fce4ec', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                              <Typography variant="caption" color="text.disabled">Sem foto</Typography>
                                            </Box>
                                          )}
                                        </Box>
                                      </Grid>
                                    );
                                  })}
                                </Grid>
                              </Grid>

                              <Grid item xs={12}><Divider /></Grid>

                              {/* Checklist */}
                              <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" fontWeight="bold" mb={1} color="primary">
                                  Checklist — Saída
                                </Typography>
                                {det.checklist.filter((c) => c.momento === 'retirada' && c.avariado).length === 0 ? (
                                  <Typography variant="body2" color="success.main">Nenhuma avaria registrada</Typography>
                                ) : (
                                  det.checklist.filter((c) => c.momento === 'retirada' && c.avariado).map((c) => (
                                    <Box key={c.id} sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}>
                                      <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main', mr: 0.5, mt: 0.2 }} />
                                      <Box>
                                        <Typography variant="body2">{c.item}</Typography>
                                        {c.descricao && <Typography variant="caption" color="text.secondary">{c.descricao}</Typography>}
                                      </Box>
                                    </Box>
                                  ))
                                )}
                              </Grid>

                              <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" fontWeight="bold" mb={1} color="error">
                                  Checklist — Volta
                                </Typography>
                                {det.checklist.filter((c) => c.momento === 'devolucao').length === 0 ? (
                                  <Typography variant="body2" color="text.secondary">Veículo ainda não devolvido</Typography>
                                ) : det.checklist.filter((c) => c.momento === 'devolucao' && c.avariado).length === 0 ? (
                                  <Typography variant="body2" color="success.main">Nenhuma avaria registrada</Typography>
                                ) : (
                                  det.checklist.filter((c) => c.momento === 'devolucao' && c.avariado).map((c) => (
                                    <Box key={c.id} sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}>
                                      <WarningAmberIcon sx={{ fontSize: 16, color: 'error.main', mr: 0.5, mt: 0.2 }} />
                                      <Box>
                                        <Typography variant="body2">{c.item}</Typography>
                                        {c.descricao && <Typography variant="caption" color="text.secondary">{c.descricao}</Typography>}
                                      </Box>
                                    </Box>
                                  ))
                                )}
                              </Grid>

                              {v.observacao_devolucao && (
                                <Grid item xs={12}>
                                  <Typography variant="subtitle2" fontWeight="bold">Observação:</Typography>
                                  <Typography variant="body2" color="text.secondary">{v.observacao_devolucao}</Typography>
                                </Grid>
                              )}
                            </Grid>
                          ) : (
                            <Typography variant="body2" color="text.secondary">Carregando...</Typography>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
            {filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#aaa' }}>
                  Nenhuma vistoria encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
