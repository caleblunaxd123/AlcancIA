import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { fromMajor } from '@/engine/money';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';

const PRESETS = ['Netflix', 'Spotify', 'YouTube', 'Gimnasio', 'Disney+', 'iCloud'];
const DAYS = [1, 5, 10, 15, 20, 25, 28];

export default function NewSubscription() {
  const theme = useTheme();
  const router = useRouter();
  const addSubscription = useFinancialStore((s) => s.addSubscription);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState(15);

  const amountValue = parseFloat(amount.replace(',', '.')) || 0;
  const canSave = name.trim().length > 0 && amountValue > 0;

  const save = () => {
    if (!canSave) return;
    addSubscription({
      id: `sub-${Date.now()}`,
      name: name.trim(),
      amount: fromMajor(amountValue),
      frequency: 'monthly',
      category: 'subscriptions',
      renewalDay: day,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <Screen edges={{ top: true, bottom: true }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.xl }}>
        <Text variant="title">Nueva suscripción</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={10}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface.primary }}>
          <Icon name="x" size={22} color="secondary" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: 0, gap: theme.spacing.xl }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {PRESETS.map((p) => (
            <Pressable key={p} onPress={() => { setName(p); Haptics.selectionAsync().catch(() => {}); }} accessibilityRole="button"
              style={{ paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: name === p ? theme.colors.brand.primary : theme.colors.border.subtle, backgroundColor: name === p ? theme.colors.brand.soft : theme.colors.surface.primary }}>
              <Text variant="caption" color={name === p ? 'brand' : 'secondary'}>{p}</Text>
            </Pressable>
          ))}
        </View>

        <TextField label="Nombre" placeholder="Netflix" value={name} onChangeText={setName} />
        <TextField label="Monto mensual" prefix="S/" placeholder="0.00" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />

        <View style={{ gap: theme.spacing.md }}>
          <Text variant="label" color="muted">Día de renovación</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {DAYS.map((d) => {
              const active = day === d;
              return (
                <Pressable key={d} onPress={() => { setDay(d); Haptics.selectionAsync().catch(() => {}); }} accessibilityRole="button"
                  style={{ paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: active ? theme.colors.brand.primary : theme.colors.border.subtle, backgroundColor: active ? theme.colors.brand.soft : theme.colors.surface.primary }}>
                  <Text variant="bodyStrong" color={active ? 'brand' : 'secondary'}>{d}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button label="Guardar suscripción" size="lg" fullWidth icon="check" disabled={!canSave} onPress={save} />
      </ScrollView>
    </Screen>
  );
}
