import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, Surface } from 'react-native-paper';
import { login } from '../../services/authService';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    if (!email || !senha) {
      Alert.alert('Atenção', 'Preencha e-mail e senha.');
      return;
    }
    setCarregando(true);
    try {
      await login(email.toLowerCase().trim(), senha);
      navigation.replace('Home');
    } catch (e) {
      Alert.alert('Erro', e.message === 'Credenciais inválidas.' ? 'E-mail ou senha incorretos.' : e.message);
    }
    setCarregando(false);
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.card} elevation={4}>
        <Text variant="headlineMedium" style={styles.titulo}>Frota App</Text>
        <Text variant="bodyMedium" style={styles.subtitulo}>Vistoria de Veículos</Text>
        <TextInput
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          mode="outlined"
        />
        <TextInput
          label="Senha"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          style={styles.input}
          mode="outlined"
        />
        <Button mode="contained" onPress={entrar} loading={carregando} style={styles.botao}>
          Entrar
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f5f5f5' },
  card: { padding: 24, borderRadius: 12 },
  titulo: { textAlign: 'center', fontWeight: 'bold', color: '#1565C0' },
  subtitulo: { textAlign: 'center', marginBottom: 24, color: '#666' },
  input: { marginBottom: 12 },
  botao: { marginTop: 8 },
});
