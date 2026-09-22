import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Chip } from '@/components/common/Chip';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { DEBT_KIND_LABELS } from '@/constants/debts';
import { fromMajor } from '@/engine/money';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';
import type { Debt } from '@/types/domain';

const KINDS = Object.keys(DEBT_KIND_LABELS) as Debt['kind'][];
const DAYS = [1, 5, 10, 15, 20, 25, 28];

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(',', '.')) || 0;
}

export default function NewDebt() {
  const theme = useTheme();
  const router = useRouter();
  const addDebt = useFinancialStore((s) => s.addDebt);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<Debt['kind']>('card');
  const [balance, setBalance] = useState('');
  const [minimum, setMinimum] = useState('');
  const [rate, setRate] = useState('');
  const [dueDay, setDueDay] = useState(15);

  const balanceValue = parseAmount(balance);
  const minimumValue = parseAmount(minimum);
  const rateValue = parseAmount(rate);
  const canSave = name.trim().length > 0 && balanceValue > 0 && minimumValue > 0;

  const save = () => {
    if (!canSave) return;
    addDebt({
      id: `debt-${Date.now()}`,
      name: name.trim(),
      kind,
      balance: fromMajor(balanceValue),
      minimumPayment: fromMajor(minimumValue),
      annualRate: rateValue / 100,
      dueDay,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <Screen edges={{ top: true, bottom: true }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.xl }}>
        <Text variant="title">Nueva deuda</Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          hitSlop={10}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface.primary }}
        >
          <Icon name="x" size={22} color="secondary" />
        </Pressable>
      </View>

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

        <Button label="Guardar deuda" size="lg" fullWidth icon="check" disabled={!canSave} onPress={save} />
      </ScrollView>
    </Screen>
  );
}
