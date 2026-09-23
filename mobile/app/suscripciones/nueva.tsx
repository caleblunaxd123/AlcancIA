import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { HeaderIconButton, PageHeader } from '@/components/common/PageHeader';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { fromMajor } from '@/engine/money';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';
import type { Frequency, Subscription } from '@/types/domain';
import { recurrenceAnchor } from '@/engine/recurrence';
import { createId } from '@/utils/id';
import { parseMoneyInput } from '@/utils/validation';

const PRESETS = ['Netflix', 'Spotify', 'YouTube', 'Gimnasio', 'Disney+', 'iCloud'];
const DAYS = [1, 5, 10, 15, 20, 25, 28];
const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' },
];

export default function NewSubscription() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useFinancialStore((s) => s.snapshot.subscriptions.find((item) => item.id === id));
  const addSubscription = useFinancialStore((s) => s.addSubscription);
  const updateSubscription = useFinancialStore((s) => s.updateSubscription);

  const [name, setName] = useState(existing?.name ?? '');
  const [amount, setAmount] = useState(existing ? String(existing.amount.minor / 100) : '');
  const [day, setDay] = useState(existing?.renewalDay ?? 15);
  const [frequency, setFrequency] = useState<Frequency>(existing?.frequency ?? 'monthly');

  const amountValue = parseMoneyInput(amount);
  const canSave = name.trim().length > 0 && amountValue !== null;

  const save = () => {
    if (!canSave) return;
    const payload: Subscription = {
      id: existing?.id ?? createId('sub'),
      name: name.trim(),
      amount: fromMajor(amountValue!),
      frequency,
      category: 'subscriptions',
      renewalDay: day,
      nextRenewalDate: recurrenceAnchor(day),
    };
    const result = existing ? updateSubscription(existing.id, payload) : addSubscription(payload);
    if (!result.ok) {
      Alert.alert('No se pudo guardar', result.error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <Screen edges={{ top: true, bottom: true }}>
      <View style={{ padding: theme.spacing.xl }}><PageHeader eyebrow={existing ? 'Cobro actualizado' : 'Control recurrente'} title={existing ? 'Editar suscripción' : 'Nueva suscripción'} subtitle={existing ? 'Ajusta monto, frecuencia o renovación' : 'Mira su costo mensual y anual'} icon="repeat" action={<HeaderIconButton icon="x" label="Cerrar" onPress={() => router.back()} />} /></View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: 0, gap: theme.spacing.xl }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {PRESETS.map((p) => (
            <Pressable key={p} onPress={() => { setName(p); Haptics.selectionAsync().catch(() => {}); }} accessibilityRole="button"
              accessibilityState={{ selected: name === p }} hitSlop={{ top: 6, bottom: 6 }}
              style={{ paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: name === p ? theme.colors.brand.primary : theme.colors.border.subtle, backgroundColor: name === p ? theme.colors.brand.soft : theme.colors.surface.primary }}>
              <Text variant="caption" color={name === p ? 'brand' : 'secondary'}>{p}</Text>
            </Pressable>
          ))}
        </View>

        <TextField label="Nombre" placeholder="Netflix" value={name} onChangeText={setName} />
        <TextField label="Monto por cobro" prefix="S/" placeholder="0.00" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />

        <View style={{ gap: theme.spacing.md }}>
          <Text variant="label" color="muted">Frecuencia</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {FREQUENCIES.map((item) => {
              const active = frequency === item.value;
              return (
                <Pressable key={item.value} onPress={() => setFrequency(item.value)} accessibilityRole="button" accessibilityState={{ selected: active }}
                  style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: theme.spacing.lg, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: active ? theme.colors.brand.primary : theme.colors.border.subtle, backgroundColor: active ? theme.colors.brand.soft : theme.colors.surface.primary }}>
                  <Text variant="caption" color={active ? 'brand' : 'secondary'}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <Text variant="label" color="muted">Día del próximo cobro</Text>
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

        <Button label={existing ? 'Guardar cambios' : 'Guardar suscripción'} size="lg" fullWidth icon="check" disabled={!canSave} onPress={save} />
      </ScrollView>
    </Screen>
  );
}
