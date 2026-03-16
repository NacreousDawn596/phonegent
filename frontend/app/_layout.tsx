/**
 * app/_layout.tsx — Root Expo Router layout
 */
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '../store';

export default function RootLayout() {
  const setServerUrl = useStore((s) => s.setServerUrl);

  useEffect(() => {
    AsyncStorage.getItem('serverUrl').then((url) => {
      if (url) setServerUrl(url);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#09090b' },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="memory" />
        <Stack.Screen name="settings" />
      </Stack>
    </GestureHandlerRootView>
  );
}
