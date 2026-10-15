import React from 'react';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import AppNavigator from './navigation/AppNavigator';

const tema = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1565C0',
    secondary: '#42a5f5',
  },
};

export default function App() {
  return (
    <PaperProvider theme={tema}>
      <AppNavigator />
    </PaperProvider>
  );
}
