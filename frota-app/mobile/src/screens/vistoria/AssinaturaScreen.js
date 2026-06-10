import React, { useRef, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import SignatureCanvas from 'react-native-signature-canvas';
import { supabase } from '../../services/supabase';

export default function AssinaturaScreen({ route, navigation }) {
  const { vistoriaId, momento } = route.params;
  const ref = useRef(null);
  const [assinado, setAssinado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function salvar(assinaturaBase64) {
    setSalvando(true);
    try {
      const campo = momento === 'retirada' ? 'assinatura_retirada' : 'assinatura_devolucao';
      const { error } = await supabase
        .from('vistorias')
        .update({ [campo]: assinaturaBase64 })
        .eq('id', vistoriaId);
      if (error) throw error;

      if (momento === 'retirada') {
        navigation.navigate('Home', { vistoriaConcluida: true });
      } else {
        navigation.navigate('DevolucaoConcluida', { vistoriaId });
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar a assinatura.');
    }
    setSalvando(false);
  }

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.titulo}>Assinatura Digital</Text>
      <Text variant="bodyMedium" style={styles.subtitulo}>
        Assine abaixo para confirmar a vistoria de {momento === 'retirada' ? 'retirada' : 'devolução'}
      </Text>

      <Surface style={styles.canvasWrapper} elevation={3}>
        <SignatureCanvas
          ref={ref}
          onOK={salvar}
          onBegin={() => setAssinado(true)}
          descriptionText=""
          clearText="Limpar"
          confirmText="Confirmar Assinatura"
          webStyle={webStyle}
        />
      </Surface>

      {!assinado && (
        <Text style={styles.dica}>← Assine com o dedo na área acima</Text>
      )}

      <Button
        mode="outlined"
        onPress={() => { ref.current?.clearSignature(); setAssinado(false); }}
        style={styles.botaoLimpar}
        disabled={salvando}
      >
        Limpar Assinatura
      </Button>
    </View>
  );
}

const webStyle = `
  .m-signature-pad { box-shadow: none; border: none; }
  .m-signature-pad--body { border: none; }
  .m-signature-pad--footer { background-color: #f5f5f5; }
  body { background-color: #fff; }
  canvas { width: 100%; }
`;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  titulo: { fontWeight: 'bold', color: '#1565C0', marginBottom: 4 },
  subtitulo: { color: '#666', marginBottom: 16 },
  canvasWrapper: { flex: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  dica: { textAlign: 'center', color: '#999', marginBottom: 8, fontStyle: 'italic' },
  botaoLimpar: { marginBottom: 8 },
});
