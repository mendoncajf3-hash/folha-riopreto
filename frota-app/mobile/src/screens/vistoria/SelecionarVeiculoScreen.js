import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Card, Text, Button, ActivityIndicator, Searchbar } from 'react-native-paper';
import { buscarVeiculos } from '../../services/vistoriaService';

export default function SelecionarVeiculoScreen({ navigation }) {
  const [veiculos, setVeiculos] = useState([]);
  const [filtrados, setFiltrados] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    buscarVeiculos().then((data) => {
      setVeiculos(data);
      setFiltrados(data);
      setCarregando(false);
    });
  }, []);

  function filtrar(texto) {
    setBusca(texto);
    const lower = texto.toLowerCase();
    setFiltrados(veiculos.filter((v) =>
      v.placa.toLowerCase().includes(lower) ||
      v.modelo.toLowerCase().includes(lower)
    ));
  }

  if (carregando) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <Searchbar placeholder="Buscar por placa ou modelo" value={busca} onChangeText={filtrar} style={styles.busca} />
      <FlatList
        data={filtrados}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.card} onPress={() => navigation.navigate('IniciarVistoria', { veiculo: item })}>
            <Card.Content>
              <Text variant="titleMedium">{item.marca} {item.modelo}</Text>
              <Text variant="bodyMedium" style={styles.placa}>{item.placa}</Text>
              <Text variant="bodySmall" style={styles.info}>{item.cor} • {item.ano}</Text>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained" compact onPress={() => navigation.navigate('IniciarVistoria', { veiculo: item })}>
                Selecionar
              </Button>
            </Card.Actions>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 12 },
  busca: { marginBottom: 12 },
  card: { marginBottom: 10, borderRadius: 10 },
  placa: { fontSize: 18, fontWeight: 'bold', color: '#1565C0', marginTop: 4 },
  info: { color: '#888', marginTop: 2 },
});
