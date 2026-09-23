import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Chip } from '@/components/common/Chip';
import { HeaderIconButton, PageHeader } from '@/components/common/PageHeader';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { DEBT_KIND_LABELS } from '@/constants/debts';
import { fromMajor } from '@/engine/money';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';
import type { Debt } from '@/types/domain';
import { createId } from '@/utils/id';
import { parseMoneyInput } from '@/utils/validation';

const KINDS = Object.keys(DEBT_KIND_LABELS) as Debt['kind'][];
const DAYS = [1, 5, 10, 15, 20, 25, 28];

export default function NewDebt() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useFinancialStore((s) => s.snapshot.debts.find((item) => item.id === id));
  const addDebt = useFinancialStore((s) => s.addDebt);
  const updateDebt = useFinancialStore((s) => s.updateDebt);

  const [name, setName] = useState(existing?.name ?? '');
  const [kind, setKind] = useState<Debt['kind']>(existing?.kind ?? 'card');
  const [balance, setBalance] = useState(existing ? String(existing.balance.minor / 100) : '');
  const [minimum, setMinimum] = useState(existing ? String(existing.minimumPayment.minor / 100) : '');
  const [rate, setRate] = useState(existing ? String(existing.annualRate * 100) : '');
  const [dueDay, setDueDay] = useState(existing?.dueDay ?? 15);

  const balanceValue = parseMoneyInput(balance);
  const minimumValue = parseMoneyInput(minimum);
  const rateValue = rate.trim() ? parseMoneyInput(rate) : 0;
  const canSave = name.trim().length > 0 && balanceValue !== null && minimumValue !== null && rateValue !== null && minimumValue <= balanceValue;

  const save = () => {
    if (!canSave) return;
    const payload: Debt = {
      id: existing?.id ?? createId('debt'),
      name: name.trim(),
      kind,
      balance: fromMajor(balanceValue!),
      minimumPayment: fromMajor(minimumValue!),
      annualRate: rateValue! / 100,
      dueDay,
    };
    const result = existing ? updateDebt(existing.id, payload) : addDebt(payload);
    if (!result.ok) {
      Alert.alert('No se pudo guardar', result.error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <Screen keyboardAware edges={{ top: true, bottom: true }}>
      <View style={{ padding: theme.spacing.xl }}><PageHeader eyebrow={existing ? 'Plan actualizado' : 'Orden sin culpa'} title={existing ? 'Editar deuda' : 'Nueva deuda'} subtitle={existing ? 'Mantén tu ruta de pago al día' : 'Conocerla es el primer paso para reducirla'} icon="credit-card" action={<HeaderIconButton icon="x" label="Cerrar" onPress={() => router.back()} />} /></View>

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: 0, gap: theme.spacing.xl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TextField label="Nombre" placeholder="Tarjeta Interbank" value={name} onChangeText={setName} />

        <View style={{ gap: theme.spacing.md }}>
          <Text variant="label" color="muted">Tipo</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {KINDS.map((k) => (
              <Chip key={k} label={DEBT_KIND_LABELS[k]} selected={kind === k} onPress={() => setKind(k)} />
            ))}
          </View>
        </View>

        <TextField label="Saldo actual" prefix="S/" placeholder="0.00" keyboardType="decimal-pad" value={balance} onChangeText={setBalance} />
        <TextField label="Cuota mínima mensual" prefix="S/" placeholder="0.00" keyboardType="decimal-pad" value={minimum} onChangeText={setMinimum} />
        <TextField label="Tasa anual (%)" suffix="%" placeholder="45" keyboardType="decimal-pad" value={rate} onChangeText={setRate} />

        <View style={{ gap: theme.spacing.md }}>
          <Text variant="label" color="muted">Día de pago</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {DAYS.map((d) => (
              <Chip key={d} label={`${d}`} selected={dueDay === d} onPress={() => setDueDay(d)} />
            ))}
          </View>
        </View>

        <Button label={existing ? 'Guardar cambios' : 'Guardar deuda'} size="lg" fullWidth icon="check" disabled={!canSave} onPress={save} />
      </ScrollView>
    </Screen>
  );
}
