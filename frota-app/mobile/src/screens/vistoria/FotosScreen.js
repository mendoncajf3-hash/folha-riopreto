import React, { useState } from 'react';
import { View, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import { Button, Text, Surface, ProgressBar } from 'react-native-paper';
import { launchCamera } from 'react-native-image-picker';
import { uploadFoto } from '../../services/vistoriaService';

const ANGULOS = [
  { key: 'frente', label: 'Frente', icone: '⬆️' },
  { key: 'traseira', label: 'Traseira', icone: '⬇️' },
  { key: 'lateral_esquerda', label: 'Lado Esquerdo', icone: '⬅️' },
  { key: 'lateral_direita', label: 'Lado Direito', icone: '➡️' },
];

export default function FotosScreen({ route, navigation }) {
  const { vistoriaId, momento } = route.params;
  const [fotos, setFotos] = useState({});
  const [enviando, setEnviando] = useState(false);

  async function tirarFoto(angulo) {
    const result = await launchCamera({ mediaType: 'photo', quality: 0.8 });
    if (result.didCancel || result.errorCode) return;
    const uri = result.assets[0].uri;
    setFotos((prev) => ({ ...prev, [angulo]: uri }));
  }

  const progresso = Object.keys(fotos).length / ANGULOS.length;
  const todasTiradas = ANGULOS.every((a) => fotos[a.key]);

  async function enviarFotos() {
    setEnviando(true);
    try {
      for (const angulo of ANGULOS) {
        await uploadFoto(vistoriaId, momento, angulo.key, fotos[angulo.key]);
      }
      navigation.navigate('Checklist', { vistoriaId, momento });
    } catch (e) {
      Alert.alert('Erro', 'Falha ao enviar fotos. Tente novamente.');
    }
    setEnviando(false);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="titleLarge" style={styles.titulo}>Fotos do Veículo</Text>
      <Text variant="bodyMedium" style={styles.subtitulo}>
        Tire foto de todos os ângulos antes de continuar
      </Text>
      <ProgressBar progress={progresso} color="#1565C0" style={styles.progresso} />
      <Text style={styles.progressoTexto}>{Object.keys(fotos).length} de {ANGULOS.length} fotos</Text>

      {ANGULOS.map((angulo) => (
        <Surface key={angulo.key} style={styles.card} elevation={2}>
          <Text variant="titleMedium">{angulo.icone} {angulo.label}</Text>
          {fotos[angulo.key] ? (
            <Image source={{ uri: fotos[angulo.key] }} style={styles.preview} />
          ) : (
            <View style={styles.semFoto}>
              <Text style={styles.semFotoTexto}>Sem foto</Text>
            </View>
          )}
          <Button
            mode={fotos[angulo.key] ? 'outlined' : 'contained'}
            onPress={() => tirarFoto(angulo.key)}
            style={styles.botaoFoto}
          >
            {fotos[angulo.key] ? 'Refazer foto' : 'Tirar foto'}
          </Button>
        </Surface>
      ))}

      <Button
        mode="contained"
        onPress={enviarFotos}
        disabled={!todasTiradas || enviando}
        loading={enviando}
        style={styles.botaoContinuar}
      >
        Continuar para Checklist
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 32 },
  titulo: { fontWeight: 'bold', color: '#1565C0', marginBottom: 4 },
  subtitulo: { color: '#666', marginBottom: 12 },
  progresso: { height: 8, borderRadius: 4, marginBottom: 4 },
  progressoTexto: { textAlign: 'right', color: '#666', marginBottom: 16, fontSize: 12 },
  card: { padding: 16, borderRadius: 12, marginBottom: 12 },
  preview: { width: '100%', height: 180, borderRadius: 8, marginTop: 10, marginBottom: 10 },
  semFoto: { width: '100%', height: 180, borderRadius: 8, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 10 },
  semFotoTexto: { color: '#999' },
  botaoFoto: { marginTop: 4 },
  botaoContinuar: { marginTop: 16 },
});
