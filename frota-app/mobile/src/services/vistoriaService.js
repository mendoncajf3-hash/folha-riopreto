import { supabase } from './supabase';

export async function iniciarVistoria({ veiculoId, colaboradorId, kmRetirada }) {
  const { data, error } = await supabase
    .from('vistorias')
    .insert({ veiculo_id: veiculoId, colaborador_id: colaboradorId, km_retirada: kmRetirada })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function salvarChecklist(vistoriaId, momento, itens) {
  const registros = itens.map((item) => ({
    vistoria_id: vistoriaId,
    momento,
    item: item.nome,
    avariado: item.avariado,
    descricao: item.descricao || null,
  }));
  const { error } = await supabase.from('checklist_avarias').insert(registros);
  if (error) throw error;
}

export async function uploadFoto(vistoriaId, momento, angulo, uri) {
  const nomeArquivo = `${vistoriaId}/${momento}/${angulo}_${Date.now()}.jpg`;

  const response = await fetch(uri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from('fotos-vistoria')
    .upload(nomeArquivo, blob, { contentType: 'image/jpeg' });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('fotos-vistoria').getPublicUrl(nomeArquivo);

  const { error: dbError } = await supabase.from('fotos_vistoria').insert({
    vistoria_id: vistoriaId,
    momento,
    angulo,
    url: data.publicUrl,
  });
  if (dbError) throw dbError;

  return data.publicUrl;
}

export async function registrarKmDevolucao(vistoriaId, { kmDevolucao, observacao }) {
  const { error } = await supabase
    .from('vistorias')
    .update({ km_devolucao: kmDevolucao, observacao_devolucao: observacao })
    .eq('id', vistoriaId);
  if (error) throw error;
}

export async function finalizarVistoria(vistoriaId) {
  const { error } = await supabase
    .from('vistorias')
    .update({ data_devolucao: new Date().toISOString(), status: 'devolvido' })
    .eq('id', vistoriaId);
  if (error) throw error;
}

export async function buscarVeiculos() {
  const { data, error } = await supabase
    .from('veiculos')
    .select('*')
    .eq('ativo', true)
    .order('modelo');
  if (error) throw error;
  return data;
}

export async function buscarHistorico(colaboradorId) {
  const { data, error } = await supabase
    .from('vistorias')
    .select(`*, veiculos(placa, modelo, marca)`)
    .eq('colaborador_id', colaboradorId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data;
}
