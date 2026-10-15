import AsyncStorage from '@react-native-async-storage/async-storage';

// Altere para o IP/domínio da sua VPS
const BASE_URL = 'http://SEU_IP_VPS/api';

async function getToken() {
  return AsyncStorage.getItem('token');
}

async function request(method, path, body) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401) {
    await AsyncStorage.multiRemove(['token', 'usuario']);
    throw new Error('SESSAO_EXPIRADA');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.erro || 'Erro na requisição');
  return data;
}

async function uploadFoto(vistoriaId, momento, angulo, uri) {
  const token = await getToken();
  const form = new FormData();
  form.append('foto', { uri, type: 'image/jpeg', name: 'foto.jpg' });
  form.append('momento', momento);
  form.append('angulo', angulo);

  const res = await fetch(`${BASE_URL}/vistorias/${vistoriaId}/fotos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.erro || 'Erro no upload');
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  uploadFoto,
};
