import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Button, TextInput, Surface, Divider } from 'react-native-paper';
import { iniciarVistoria } from '../../services/vistoriaService';

export default function IniciarVistoriaScreen({ route, navigation }) {
  const { veiculo } = route.params;
  const [km, setKm] = useState('');
  const [iniciando, setIniciando] = useState(false);

  async function iniciar() {
    if (!km || isNaN(Number(km))) {
      Alert.alert('Atenção', 'Informe o KM atual do veículo.');
      return;
    }
    setIniciando(true);
    try {
      const vistoria = await iniciarVistoria({ veiculoId: veiculo.id, kmRetirada: Number(km) });
      navigation.navigate('Fotos', { vistoriaId: vistoria.id, momento: 'retirada' });
    } catch (e) {
      Alert.alert('Erro', e.message || 'Não foi possível iniciar a vistoria.');
    }
    setIniciando(false);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Surface style={styles.card} elevation={3}>
        <Text variant="titleLarge" style={styles.titulo}>
          {veiculo.marca} {veiculo.modelo}
        </Text>
        <Text variant="headlineSmall" style={styles.placa}>{veiculo.placa}</Text>
        <Divider style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Cor:</Text>
          <Text style={styles.infoValor}>{veiculo.cor || '–'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ano:</Text>
          <Text style={styles.infoValor}>{veiculo.ano || '–'}</Text>
        </View>
      </Surface>

      <Surface style={styles.card} elevation={2}>
        <Text variant="titleMedium" style={styles.secaoTitulo}>KM Atual do Veículo</Text>
        <TextInput
          label="Quilometragem"
          value={km}
          onChangeText={setKm}
          keyboardType="numeric"
          mode="outlined"
          placeholder="Ex: 45320"
          right={<TextInput.Affix text="km" />}
          style={styles.input}
        />
        <Text variant="bodySmall" style={styles.aviso}>
          * Registre exatamente o que está no painel do carro
        </Text>
      </Surface>

      <Surface style={styles.passos} elevation={1}>
        <Text variant="titleSmall" style={styles.passosTitulo}>O que você vai fazer agora:</Text>
        {['Tirar 4 fotos do veículo', 'Preencher checklist de avarias', 'Assinar digitalmente'].map((p, i) => (
          <Text key={i} style={styles.passo}>{'  '}✓ {p}</Text>
        ))}
      </Surface>

      <Button
        mode="contained"
        onPress={iniciar}
        loading={iniciando}
        disabled={!km || iniciando}
        style={styles.botao}
        contentStyle={styles.botaoContent}
      >
        Iniciar Vistoria
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 32 },
  card: { padding: 16, borderRadius: 12, marginBottom: 12 },
  titulo: { fontWeight: 'bold', color: '#333' },
  placa: { color: '#1565C0', fontWeight: 'bold', marginTop: 4 },
  divider: { marginVertical: 12 },
  infoRow: { flexDirection: 'row', marginBottom: 6 },
  infoLabel: { color: '#888', width: 50 },
  infoValor: { color: '#333', fontWeight: '500' },
  secaoTitulo: { fontWeight: 'bold', marginBottom: 12, color: '#333' },
  input: { marginBottom: 8 },
  aviso: { color: '#888', marginLeft: 4 },
  passos: { padding: 16, borderRadius: 12, marginBottom: 16, backgroundColor: '#e8f5e9' },
  passosTitulo: { fontWeight: 'bold', color: '#2e7d32', marginBottom: 8 },
  passo: { color: '#388e3c', marginBottom: 4, fontSize: 14 },
  botao: { borderRadius: 8 },
  botaoContent: { paddingVertical: 6 },
});
