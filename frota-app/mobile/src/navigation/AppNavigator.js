import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { supabase } from '../services/supabase';

import LoginScreen from '../screens/auth/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import SelecionarVeiculoScreen from '../screens/vistoria/SelecionarVeiculoScreen';
import IniciarVistoriaScreen from '../screens/vistoria/IniciarVistoriaScreen';
import FotosScreen from '../screens/vistoria/FotosScreen';
import ChecklistScreen from '../screens/vistoria/ChecklistScreen';
import AssinaturaScreen from '../screens/vistoria/AssinaturaScreen';
import DevolucaoKmScreen from '../screens/devolucao/DevolucaoKmScreen';
import DevolucaoConcluidaScreen from '../screens/devolucao/DevolucaoConcluida';

const Stack = createStackNavigator();

const headerStyle = { backgroundColor: '#1565C0' };
const headerTintColor = '#fff';

export default function AppNavigator() {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregando(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (carregando) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle, headerTintColor }}>
        {!sessao ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            {/* Tela principal */}
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />

            {/* Fluxo de retirada */}
            <Stack.Screen name="SelecionarVeiculo" component={SelecionarVeiculoScreen} options={{ title: 'Selecionar Veículo' }} />
            <Stack.Screen name="IniciarVistoria" component={IniciarVistoriaScreen} options={{ title: 'Iniciar Vistoria' }} />
            <Stack.Screen name="Fotos" component={FotosScreen} options={{ title: 'Fotos do Veículo' }} />
            <Stack.Screen name="Checklist" component={ChecklistScreen} options={{ title: 'Checklist de Avarias' }} />
            <Stack.Screen name="Assinatura" component={AssinaturaScreen} options={{ title: 'Assinatura Digital' }} />

            {/* Fluxo de devolução */}
            <Stack.Screen name="Devolucao" component={DevolucaoKmScreen} options={{ title: 'Devolver Veículo' }} />
            <Stack.Screen name="DevolucaoConcluida" component={DevolucaoConcluidaScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
