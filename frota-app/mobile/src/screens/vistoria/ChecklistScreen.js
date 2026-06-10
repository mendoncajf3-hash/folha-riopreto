import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Checkbox, Surface, TextInput, Button, Divider } from 'react-native-paper';
import { salvarChecklist, finalizarVistoria } from '../../services/vistoriaService';

const ITENS_CHECKLIST = [
  { nome: 'Para-choque dianteiro', grupo: 'Frente' },
  { nome: 'Faróis dianteiros', grupo: 'Frente' },
  { nome: 'Capô', grupo: 'Frente' },
  { nome: 'Para-brisa dianteiro', grupo: 'Frente' },
  { nome: 'Para-choque traseiro', grupo: 'Traseira' },
  { nome: 'Lanternas traseiras', grupo: 'Traseira' },
  { nome: 'Para-brisa traseiro', grupo: 'Traseira' },
  { nome: 'Tampa do porta-malas', grupo: 'Traseira' },
  { nome: 'Porta dianteira esquerda', grupo: 'Lateral Esquerda' },
  { nome: 'Porta traseira esquerda', grupo: 'Lateral Esquerda' },
  { nome: 'Retrovisor esquerdo', grupo: 'Lateral Esquerda' },
  { nome: 'Porta dianteira direita', grupo: 'Lateral Direita' },
  { nome: 'Porta traseira direita', grupo: 'Lateral Direita' },
  { nome: 'Retrovisor direito', grupo: 'Lateral Direita' },
  { nome: 'Teto', grupo: 'Teto' },
  { nome: 'Rodas e pneus', grupo: 'Geral' },
  { nome: 'Vidros laterais', grupo: 'Geral' },
  { nome: 'Interior / bancos', grupo: 'Geral' },
];

const grupos = [...new Set(ITENS_CHECKLIST.map((i) => i.grupo))];

export default function ChecklistScreen({ route, navigation }) {
  const { vistoriaId, momento } = route.params;
  const [itens, setItens] = useState(
    ITENS_CHECKLIST.map((i) => ({ ...i, avariado: false, descricao: '' }))
  );
  const [salvando, setSalvando] = useState(false);

  function toggleAvaria(index) {
    setItens((prev) => prev.map((it, i) => i === index ? { ...it, avariado: !it.avariado } : it));
  }

  function setDescricao(index, texto) {
    setItens((prev) => prev.map((it, i) => i === index ? { ...it, descricao: texto } : it));
  }

  async function salvar() {
    setSalvando(true);
    try {
      await salvarChecklist(vistoriaId, momento, itens);
      if (momento === 'devolucao') {
        await finalizarVistoria(vistoriaId);
      }
      navigation.navigate('Assinatura', { vistoriaId, momento });
    } catch (e) {
      Alert.alert('Erro', 'Falha ao salvar checklist.');
    }
    setSalvando(false);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="titleLarge" style={styles.titulo}>Checklist de Avarias</Text>
      <Text variant="bodyMedium" style={styles.subtitulo}>Marque os itens com avaria</Text>

      {grupos.map((grupo) => (
        <Surface key={grupo} style={styles.grupo} elevation={2}>
          <Text variant="titleSmall" style={styles.grupoTitulo}>{grupo}</Text>
          <Divider style={{ marginBottom: 8 }} />
          {itens
            .map((item, index) => ({ ...item, index }))
            .filter((item) => item.grupo === grupo)
            .map(({ nome, avariado, descricao, index }) => (
              <View key={nome}>
                <View style={styles.itemRow}>
                  <Checkbox
                    status={avariado ? 'checked' : 'unchecked'}
                    onPress={() => toggleAvaria(index)}
                    color="#d32f2f"
                  />
                  <Text style={[styles.itemNome, avariado && styles.avariado]}>{nome}</Text>
                </View>
                {avariado && (
                  <TextInput
                    label="Descreva a avaria"
                    value={descricao}
                    onChangeText={(t) => setDescricao(index, t)}
                    mode="outlined"
                    dense
                    style={styles.descricaoInput}
                  />
                )}
              </View>
            ))}
        </Surface>
      ))}

      <Button mode="contained" onPress={salvar} loading={salvando} style={styles.botao}>
        Continuar para Assinatura
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 32 },
  titulo: { fontWeight: 'bold', color: '#1565C0', marginBottom: 4 },
  subtitulo: { color: '#666', marginBottom: 16 },
  grupo: { padding: 12, borderRadius: 12, marginBottom: 12 },
  grupoTitulo: { fontWeight: 'bold', marginBottom: 8, color: '#333' },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  itemNome: { flex: 1, fontSize: 14, color: '#333' },
  avariado: { color: '#d32f2f', fontWeight: 'bold' },
  descricaoInput: { marginLeft: 40, marginBottom: 8 },
  botao: { marginTop: 16 },
});
