import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

export async function login(email, senha) {
  const { token, usuario } = await api.post('/auth/login', { email, senha });
  await AsyncStorage.multiSet([
    ['token', token],
    ['usuario', JSON.stringify(usuario)],
  ]);
  return usuario;
}

export async function logout() {
  await AsyncStorage.multiRemove(['token', 'usuario']);
}

export async function getUsuarioSalvo() {
  const json = await AsyncStorage.getItem('usuario');
  return json ? JSON.parse(json) : null;
}

export async function isAutenticado() {
  const token = await AsyncStorage.getItem('token');
  return !!token;
}
