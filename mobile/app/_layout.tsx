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
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from '@/theme';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAppStore } from '@/store/appStore';
import { useFinancialStore } from '@/store/financialStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background.primary },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
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
        <Stack.Screen name="suscripciones/index" />
        <Stack.Screen name="suscripciones/nueva" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="deudas/index" />
        <Stack.Screen name="deudas/nueva" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="deudas/[id]" />
        <Stack.Screen name="calendario" />
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
  const finHydrated = useFinancialStore((s) => s.hydrated);
  const ready = (fontsLoaded || fontError) && appHydrated && finHydrated;

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
