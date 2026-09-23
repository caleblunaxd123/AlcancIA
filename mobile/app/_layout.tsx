import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { setStatusBarStyle } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from '@/theme';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';
import { useSyncEngine } from '@/hooks/useSyncEngine';
import { useFinancialStore } from '@/store/financialStore';
import { useSharedStore } from '@/store/sharedStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const theme = useTheme();
  const authenticated = useAuthStore((state) => state.authenticated);
  // Imperative default (a declarative <StatusBar> here would re-apply on every
  // render and override screens with a dark header, see useLightStatusBar).
  useEffect(() => {
    setStatusBarStyle(theme.scheme === 'dark' ? 'light' : 'dark');
  }, [theme.scheme]);
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background.primary },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="auth/forgot-password" />
        <Stack.Screen name="legal/[doc]" />
        <Stack.Protected guard={authenticated}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="puedo-comprarlo"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="meta/[id]" />
        <Stack.Screen name="meta/nueva" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="movimiento/nuevo" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="movimiento/[id]" />
        <Stack.Screen name="mas" />
        <Stack.Screen name="cuenta/perfil" />
        <Stack.Screen name="cuenta/privacidad" />
        <Stack.Screen name="suscripciones/index" />
        <Stack.Screen name="suscripciones/nueva" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="deudas/index" />
        <Stack.Screen name="deudas/nueva" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="deudas/[id]" />
        <Stack.Screen name="calendario" />
        <Stack.Screen name="compartidos/nuevo" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="compartidos/[id]" />
        <Stack.Screen name="compartidos/gasto" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="retos" />
        </Stack.Protected>
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const appHydrated = useAppStore((s) => s.hydrated);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const finHydrated = useFinancialStore((s) => s.hydrated);
  const sharedHydrated = useSharedStore((s) => s.hydrated);
  const syncHydrated = useSyncStore((s) => s.hydrated);
  const [loadDelayed, setLoadDelayed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setLoadDelayed(true), 5000);
    return () => clearTimeout(timer);
  }, []);
  const ready = (fontsLoaded || fontError || loadDelayed) && appHydrated && authHydrated && finHydrated && sharedHydrated && syncHydrated;
  useSyncEngine(Boolean(ready));

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (!ready) return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 18 }}>
      <Text style={{ fontSize: 30, fontWeight: '700', color: '#0F172A' }}>AlcancIA</Text>
      <ActivityIndicator size="large" color="#00B980" />
      <Text accessibilityLiveRegion="polite" style={{ color: '#475569', textAlign: 'center' }}>
        {loadDelayed ? 'Está tomando más de lo esperado. Puedes intentar cargar de nuevo.' : 'Preparando tu AlcancIA…'}
      </Text>
      {loadDelayed ? <Pressable accessibilityRole="button" onPress={() => {
        for (const store of [useAppStore, useAuthStore, useFinancialStore, useSharedStore, useSyncStore]) {
          Promise.resolve(store.persist.rehydrate()).catch(() => {});
        }
      }} style={{ padding: 16 }}><Text style={{ color: '#007F5F', fontWeight: '700' }}>Volver a intentar</Text></Pressable> : null}
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider fontsReady={fontsLoaded}>
          <ErrorBoundary>
            <RootNavigator />
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
