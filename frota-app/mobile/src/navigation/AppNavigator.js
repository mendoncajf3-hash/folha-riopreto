import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { supabase } from '../services/supabase';

import LoginScreen from '../screens/auth/LoginScreen';
import SelecionarVeiculoScreen from '../screens/vistoria/SelecionarVeiculoScreen';
import FotosScreen from '../screens/vistoria/FotosScreen';
import ChecklistScreen from '../screens/vistoria/ChecklistScreen';

const Stack = createStackNavigator();

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
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#1565C0' }, headerTintColor: '#fff' }}>
        {!sessao ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="SelecionarVeiculo" component={SelecionarVeiculoScreen} options={{ title: 'Selecionar Veículo' }} />
            <Stack.Screen name="Fotos" component={FotosScreen} options={{ title: 'Fotos do Veículo' }} />
            <Stack.Screen name="Checklist" component={ChecklistScreen} options={{ title: 'Checklist de Avarias' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
