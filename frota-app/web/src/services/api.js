const BASE = import.meta.env.VITE_API_URL || '/api';

function token() {
  return localStorage.getItem('token');
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/';
    return;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.erro || 'Erro na requisição');
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),

  async uploadFoto(vistoriaId, momento, angulo, file) {
    const form = new FormData();
    form.append('foto', file);
    form.append('momento', momento);
    form.append('angulo', angulo);
    const res = await fetch(`${BASE}/vistorias/${vistoriaId}/fotos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Erro no upload');
    return data;
  },
};
