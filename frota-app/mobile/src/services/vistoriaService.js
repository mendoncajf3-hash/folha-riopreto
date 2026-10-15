import { api } from './api';

export async function buscarVeiculos() {
  return api.get('/veiculos/disponiveis');
}

export async function iniciarVistoria({ veiculoId, kmRetirada }) {
  return api.post('/vistorias', { veiculo_id: veiculoId, km_retirada: kmRetirada });
}

export async function uploadFoto(vistoriaId, momento, angulo, uri) {
  return api.uploadFoto(vistoriaId, momento, angulo, uri);
}

export async function salvarChecklist(vistoriaId, momento, itens) {
  return api.post(`/vistorias/${vistoriaId}/checklist`, { momento, itens });
}

export async function registrarKmDevolucao(vistoriaId, { kmDevolucao, observacao }) {
  return api.patch(`/vistorias/${vistoriaId}`, {
    km_devolucao: kmDevolucao,
    observacao_devolucao: observacao || '',
  });
}

export async function finalizarVistoria(vistoriaId) {
  return api.patch(`/vistorias/${vistoriaId}`, { status: 'devolvido' });
}

export async function salvarAssinatura(vistoriaId, momento, assinatura) {
  const campo = momento === 'retirada'
    ? { assinatura_retirada: assinatura }
    : { assinatura_devolucao: assinatura };
  return api.patch(`/vistorias/${vistoriaId}`, campo);
}

export async function buscarHistorico() {
  return api.get('/vistorias/meu-historico');
}
