import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, Divider } from 'react-native-paper';

export default function DevolucaoKmScreen({ route, navigation }) {
  const { vistoria } = route.params;
  const [km, setKm] = useState('');
  const [observacao, setObservacao] = useState('');

  function continuar() {
    const kmNum = Number(km);
    if (!km || isNaN(kmNum)) {
      Alert.alert('Atenção', 'Informe o KM atual do veículo.');
      return;
    }
    if (kmNum < vistoria.km_retirada) {
      Alert.alert('Atenção', `KM de devolução (${kmNum}) não pode ser menor que o de retirada (${vistoria.km_retirada}).`);
      return;
    }
    navigation.navigate('Fotos', {
      vistoriaId: vistoria.id,
      momento: 'devolucao',
      kmDevolucao: kmNum,
      observacao,
    });
  }

  const kmPercorrido = km && !isNaN(Number(km)) ? Number(km) - vistoria.km_retirada : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Surface style={styles.card} elevation={2}>
        <Text variant="titleMedium" style={styles.cardTitulo}>Resumo da Retirada</Text>
        <Divider style={{ marginVertical: 8 }} />
        <View style={styles.row}>
          <Text style={styles.label}>Veículo:</Text>
          <Text style={styles.valor}>{vistoria.veiculos?.marca} {vistoria.veiculos?.modelo}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Placa:</Text>
          <Text style={[styles.valor, styles.placa]}>{vistoria.veiculos?.placa}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>KM saída:</Text>
          <Text style={styles.valor}>{vistoria.km_retirada} km</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Retirado em:</Text>
          <Text style={styles.valor}>{new Date(vistoria.data_retirada).toLocaleString('pt-BR')}</Text>
        </View>
      </Surface>

      <Surface style={styles.card} elevation={2}>
        <Text variant="titleMedium" style={styles.cardTitulo}>KM de Devolução</Text>
        <TextInput
          label="Quilometragem atual"
          value={km}
          onChangeText={setKm}
          keyboardType="numeric"
          mode="outlined"
          right={<TextInput.Affix text="km" />}
          style={styles.input}
        />
        {kmPercorrido !== null && kmPercorrido >= 0 && (
          <Text style={styles.kmPercorrido}>Km percorrido: {kmPercorrido} km</Text>
        )}
        <TextInput
          label="Observações (opcional)"
          value={observacao}
          onChangeText={setObservacao}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
          placeholder="Ex: carro retornado com o tanque abaixo da metade"
        />
      </Surface>

      <Button mode="contained" onPress={continuar} style={styles.botao} contentStyle={styles.botaoContent}>
        Continuar para Fotos
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 32 },
  card: { padding: 16, borderRadius: 12, marginBottom: 12 },
  cardTitulo: { fontWeight: 'bold', color: '#333', marginBottom: 4 },
  row: { flexDirection: 'row', marginBottom: 6 },
  label: { color: '#888', width: 90 },
  valor: { color: '#333', flex: 1 },
  placa: { color: '#1565C0', fontWeight: 'bold' },
  input: { marginBottom: 10 },
  kmPercorrido: { color: '#2e7d32', fontWeight: 'bold', marginBottom: 8, marginLeft: 4 },
  botao: { borderRadius: 8 },
  botaoContent: { paddingVertical: 6 },
});
