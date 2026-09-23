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
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from '@/theme';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { useFinancialStore } from '@/store/financialStore';
import { useSharedStore } from '@/store/sharedStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const theme = useTheme();
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
        <Stack.Screen name="suscripciones/index" />
        <Stack.Screen name="suscripciones/nueva" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="deudas/index" />
        <Stack.Screen name="deudas/nueva" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="deudas/[id]" />
        <Stack.Screen name="calendario" />
        <Stack.Screen name="compartidos/nuevo" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="compartidos/[id]" />
        <Stack.Screen name="compartidos/gasto" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
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
  const ready = (fontsLoaded || fontError) && appHydrated && authHydrated && finHydrated && sharedHydrated;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  const onLayout = useCallback(() => {}, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayout}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <RootNavigator />
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
