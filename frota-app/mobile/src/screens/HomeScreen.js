import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Button, Surface, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { getUsuarioSalvo, logout } from '../services/authService';
import { buscarHistorico } from '../services/vistoriaService';

export default function HomeScreen({ navigation }) {
  const [usuario, setUsuario] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [emUso, setEmUso] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function carregar() {
    const u = await getUsuarioSalvo();
    setUsuario(u);
    const hist = await buscarHistorico();
    setHistorico(hist);
    setEmUso(hist.find((v) => v.status === 'em_uso') || null);
    setCarregando(false);
    setRefreshing(false);
  }

  useFocusEffect(useCallback(() => { carregar(); }, []));

  async function sair() {
    await logout();
    navigation.replace('Login');
  }

  if (carregando) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={2}>
        <View>
          <Text variant="titleMedium" style={styles.nomeColaborador}>
            Olá, {usuario?.nome?.split(' ')[0]}
          </Text>
          <Text variant="bodySmall" style={styles.matricula}>
            Matrícula: {usuario?.matricula}
          </Text>
        </View>
        <Button mode="text" onPress={sair} compact textColor="#90caf9">Sair</Button>
      </Surface>

      {emUso ? (
        <Surface style={styles.emUso} elevation={3}>
          <Text variant="titleSmall" style={styles.emUsoTitulo}>Veículo em uso</Text>
          <Text variant="headlineSmall" style={styles.placaEmUso}>
            {emUso.veiculos?.placa}
          </Text>
          <Text style={styles.modeloEmUso}>
            {emUso.veiculos?.marca} {emUso.veiculos?.modelo}
          </Text>
          <Text style={styles.kmEmUso}>KM retirada: {emUso.km_retirada}</Text>
          <Divider style={{ marginVertical: 12 }} />
          <Button
            mode="contained"
            buttonColor="#d32f2f"
            onPress={() => navigation.navigate('Devolucao', { vistoria: emUso })}
          >
            Devolver Veículo
          </Button>
        </Surface>
      ) : (
        <Surface style={styles.semUso} elevation={2}>
          <Text variant="titleMedium" style={styles.semUsoTexto}>
            Nenhum veículo em uso
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('SelecionarVeiculo')}
            style={styles.botaoPegar}
          >
            Pegar um Veículo
          </Button>
        </Surface>
      )}

      <Text variant="titleSmall" style={styles.historicoTitulo}>Histórico</Text>
      <FlatList
        data={historico.filter((v) => v.status === 'devolvido')}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); carregar(); }} />
        }
        renderItem={({ item }) => (
          <Surface style={styles.historicoItem} elevation={1}>
            <View style={styles.historicoRow}>
              <View>
                <Text style={styles.historicoPlaca}>{item.veiculos?.placa}</Text>
                <Text style={styles.historicoModelo}>{item.veiculos?.marca} {item.veiculos?.modelo}</Text>
                <Text style={styles.historicoData}>
                  {new Date(item.criado_em).toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <Chip icon="check-circle" compact>Devolvido</Chip>
            </View>
          </Surface>
        )}
        ListEmptyComponent={<Text style={styles.semHistorico}>Nenhuma vistoria anterior</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#1565C0' },
  nomeColaborador: { color: '#fff', fontWeight: 'bold' },
  matricula: { color: '#90caf9' },
  emUso: { margin: 16, padding: 16, borderRadius: 12, backgroundColor: '#fff3e0', borderLeftWidth: 4, borderLeftColor: '#f57c00' },
  emUsoTitulo: { color: '#f57c00', fontWeight: 'bold', marginBottom: 4 },
  placaEmUso: { color: '#e65100', fontWeight: 'bold' },
  modeloEmUso: { color: '#555', marginTop: 2 },
  kmEmUso: { color: '#777', marginTop: 4, fontSize: 13 },
  semUso: { margin: 16, padding: 20, borderRadius: 12, alignItems: 'center' },
  semUsoTexto: { color: '#666', marginBottom: 16 },
  botaoPegar: { width: '100%' },
  historicoTitulo: { paddingHorizontal: 16, paddingBottom: 8, color: '#333', fontWeight: 'bold' },
  historicoItem: { marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 10 },
  historicoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historicoPlaca: { fontWeight: 'bold', color: '#1565C0', fontSize: 15 },
  historicoModelo: { color: '#555', fontSize: 13 },
  historicoData: { color: '#999', fontSize: 12, marginTop: 2 },
  semHistorico: { textAlign: 'center', color: '#aaa', padding: 24 },
});
