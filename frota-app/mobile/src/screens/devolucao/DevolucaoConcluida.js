import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';

export default function DevolucaoConcluidaScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Surface style={styles.card} elevation={4}>
        <Text style={styles.icone}>✅</Text>
        <Text variant="headlineSmall" style={styles.titulo}>Devolução Concluída!</Text>
        <Text variant="bodyMedium" style={styles.subtitulo}>
          O veículo foi devolvido com sucesso.{'\n'}
          Todas as fotos, checklist e assinatura foram registrados.
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Home')}
          style={styles.botao}
        >
          Voltar ao Início
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f5f5f5' },
  card: { padding: 32, borderRadius: 16, alignItems: 'center' },
  icone: { fontSize: 64, marginBottom: 16 },
  titulo: { fontWeight: 'bold', color: '#2e7d32', textAlign: 'center', marginBottom: 12 },
  subtitulo: { color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  botao: { width: '100%' },
});
