import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { PageHeader } from '@/components/common/PageHeader';
import { SyncStatusLine } from '@/components/common/SyncStatusLine';
import { syncNow } from '@/services/sync';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { useFinancialStore } from '@/store/financialStore';
import { useSharedStore } from '@/store/sharedStore';
import { useSyncStore } from '@/store/syncStore';
import { useTheme, useThemePreference } from '@/theme';

export default function Mas() {
  const theme = useTheme();
  const router = useRouter();
  const { scheme, setPreference } = useThemePreference();
  const name = useAppStore((s) => s.name);
  const haptics = useAppStore((s) => s.hapticsEnabled);
  const setHaptics = useAppStore((s) => s.setHaptics);
  const resetOnboarding = useAppStore((s) => s.resetOnboarding);
  const resetData = useFinancialStore((s) => s.reset);
  const resetShared = useSharedStore((s) => s.reset);
  const account = useAuthStore((s) => s.account);
  const logout = useAuthStore((s) => s.logout);

  const modules: { label: string; icon: string; href: string; sub: string }[] = [
    { label: 'Misiones', icon: 'trophy', href: '/retos', sub: 'Hábitos pequeños, progreso real' },
    { label: 'Suscripciones', icon: 'repeat', href: '/suscripciones', sub: 'Lo que pagas cada mes' },
    { label: 'Deudas', icon: 'credit-card', href: '/deudas', sub: 'Tu camino para salir' },
    { label: 'Calendario', icon: 'calendar', href: '/calendario', sub: 'Tus pagos e ingresos del mes' },
    { label: 'Privacidad y datos', icon: 'shield-check', href: '/cuenta/privacidad', sub: 'Descarga o elimina tu cuenta y tus datos' },
  ];

  const confirmReset = () => {
    Alert.alert('Reiniciar AlcancIA', account?.serverId
      ? 'Se borrarán tus datos en este celular y en tu respaldo en la nube, y volverás al inicio. ¿Continuar?'
      : 'Se borrarán tus datos y volverás al inicio. ¿Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reiniciar',
        style: 'destructive',
        onPress: () => {
          resetData();
          resetShared();
          resetOnboarding();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  const signOut = async () => {
    // Upload anything pending first, so nothing is lost on this device's sign-out.
    await syncNow();
    const pending = account?.serverId != null && useSyncStore.getState().dirty;
    const finish = async () => {
      await logout();
      router.replace('/auth/login');
    };
    if (!pending) return finish();
    Alert.alert('Hay cambios sin respaldar', 'No pudimos subir tus últimos cambios a la nube. Si cierras sesión ahora, quedarán solo en este celular hasta que vuelvas a entrar.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar igual', style: 'destructive', onPress: () => void finish() },
    ]);
  };

  const confirmLogout = () => {
    Alert.alert('Cerrar sesión', account?.serverId
      ? 'Tus datos están respaldados en la nube. Al volver a entrar, desde este u otro celular, los verás igual.'
      : 'Tus datos permanecerán en este dispositivo.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', onPress: () => void signOut() },
    ]);
  };

  return (
    <Screen edges={{ top: true }}>
      <View style={{ padding: theme.spacing.xl }}><PageHeader title="Mi cuenta" subtitle="Perfil, herramientas y preferencias" onBack={() => router.back()} /></View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: 0, gap: theme.spacing.xl }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.push('/cuenta/perfil')} accessibilityRole="button" accessibilityLabel="Editar perfil y seguridad">
        <Card variant="interactive">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
              <Text variant="subtitle" color="brand">{(name || 'A').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="subtitle">{name || 'Tu perfil'}</Text>
              <Text variant="caption" color="muted">{account?.email ?? 'Cuenta local de AlcancIA'}</Text>
              <SyncStatusLine />
            </View>
            <Icon name="chevron-right" size={20} color="muted" />
          </View>
        </Card>
        </Pressable>

        <View style={{ gap: theme.spacing.md }}>
          {modules.map((m) => (
            <Pressable key={m.href} onPress={() => router.push(m.href as never)} accessibilityRole="button" accessibilityLabel={m.label}>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                  <View style={{ width: 44, height: 44, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface.interactive, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={m.icon} size={22} color="brand" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="h3">{m.label}</Text>
                    <Text variant="caption" color="muted">{m.sub}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="muted" />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>

        <Card>
          <Text variant="label" color="muted" style={{ marginBottom: theme.spacing.md }}>Preferencias</Text>
          <SettingRow icon="moon" label="Modo oscuro" value={scheme === 'dark'} onChange={(v) => setPreference(v ? 'dark' : 'light')} />
          <SettingRow icon="vibrate" label="Vibración" value={haptics} onChange={setHaptics} last />
        </Card>

        <Pressable onPress={confirmLogout} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, justifyContent: 'center', minHeight: 48 }}>
          <Icon name="log-out" size={18} color="secondary" />
          <Text variant="bodyStrong" color="secondary">Cerrar sesión</Text>
        </Pressable>

        <Pressable onPress={confirmReset} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, justifyContent: 'center', paddingVertical: theme.spacing.md }}>
          <Icon name="rotate-ccw" size={16} color="negative" />
          <Text variant="bodyStrong" color="negative">Reiniciar AlcancIA</Text>
        </Pressable>
        <Text variant="caption" color="muted" center>AlcancIA {Constants.expoConfig?.version ?? ''}</Text>
      </ScrollView>
    </Screen>
  );
}

function SettingRow({ icon, label, value, onChange, last }: { icon: string; label: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.md, borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.colors.border.subtle }}>
      <Icon name={icon} size={20} color="secondary" />
      <Text variant="body" style={{ flex: 1 }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.colors.brand.primary, false: theme.colors.surface.interactive }}
        thumbColor={theme.colors.hero.text}
      />
    </View>
  );
}
