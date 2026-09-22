import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { useAppStore } from '@/store/appStore';
import { useFinancialStore } from '@/store/financialStore';
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

  const modules: { label: string; icon: string; href: string; sub: string }[] = [
    { label: 'Misiones', icon: 'trophy', href: '/retos', sub: 'Hábitos pequeños, progreso real' },
    { label: 'Suscripciones', icon: 'repeat', href: '/suscripciones', sub: 'Lo que pagas cada mes' },
    { label: 'Deudas', icon: 'credit-card', href: '/deudas', sub: 'Tu camino para salir' },
    { label: 'Calendario', icon: 'calendar', href: '/calendario', sub: 'Tus pagos e ingresos del mes' },
  ];

  const confirmReset = () => {
    Alert.alert('Reiniciar AlcancIA', 'Se borrarán tus datos y volverás al inicio. ¿Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reiniciar',
        style: 'destructive',
        onPress: () => {
          resetData();
          resetOnboarding();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  return (
    <Screen edges={{ top: true }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.xl, gap: theme.spacing.md }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={10}>
          <Icon name="chevron-left" size={26} color="secondary" />
        </Pressable>
        <Text variant="subtitle" style={{ flex: 1 }}>Más</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: 0, gap: theme.spacing.xl }} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
              <Text variant="subtitle" color="brand">{(name || 'A').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="subtitle">{name || 'Tu perfil'}</Text>
              <Text variant="caption" color="muted">AlcancIA</Text>
            </View>
          </View>
        </Card>

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

        <Pressable onPress={confirmReset} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, justifyContent: 'center', paddingVertical: theme.spacing.md }}>
          <Icon name="rotate-ccw" size={16} color="negative" />
          <Text variant="bodyStrong" color="negative">Reiniciar AlcancIA</Text>
        </Pressable>
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
        thumbColor={theme.colors.text.onBrand}
      />
    </View>
  );
}
