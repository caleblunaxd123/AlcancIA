import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { HeaderIconButton, PageHeader } from '@/components/common/PageHeader';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { Money } from '@/components/financial/Money';
import { ScenarioSlider } from '@/components/financial/ScenarioSlider';
import { DEBT_KIND_ICONS, DEBT_KIND_LABELS } from '@/constants/debts';
import { interestSavedWithExtra, payoffForDebt } from '@/engine/debts';
import { formatMoney, toMajor } from '@/engine/money';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';

function monthsLabel(months: number | null): string {
  if (months == null) return 'no se reduce';
  if (months === 0) return 'liquidada';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} meses`;
  return rest === 0 ? `${years} años` : `${years} a ${rest} m`;
}

export default function DebtDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const debt = useFinancialStore((s) => s.snapshot.debts.find((d) => d.id === id));
  const currentBalance = useFinancialStore((s) => s.snapshot.currentBalance);
  const payDebt = useFinancialStore((s) => s.payDebt);
  const deleteDebt = useFinancialStore((s) => s.deleteDebt);

  const [extra, setExtra] = useState(0);
  const [payment, setPayment] = useState('');

  const base = useMemo(() => (debt ? payoffForDebt(debt) : null), [debt]);
  const scenario = useMemo(
    () => (debt && extra > 0 ? interestSavedWithExtra(debt, Math.round(extra * 100)) : null),
    [debt, extra],
  );

  if (!debt || !base) {
    return (
      <Screen edges={{ top: true }}>
        <View style={{ padding: theme.spacing.xl, gap: theme.spacing.md }}>
          <Text variant="title">Deuda no encontrada</Text>
          <Button label="Volver" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const sliderMax = Math.max(200, Math.ceil(toMajor(debt.minimumPayment)) * 2);
  const paymentValue = parseFloat(payment.replace(',', '.')) || 0;
  const canPay = paymentValue > 0 && paymentValue <= toMajor(debt.balance) && paymentValue <= toMajor(currentBalance);

  const confirmDelete = () => {
    Alert.alert('Eliminar deuda', `¿Eliminar ${debt.name}? Tu historial de pagos no se conserva.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          deleteDebt(debt.id);
          router.back();
        },
      },
    ]);
  };

  const onPay = () => {
    if (!canPay) return;
    const result = payDebt(debt.id, Math.round(paymentValue * 100));
    if (!result.ok) {
      Alert.alert('No se pudo registrar', result.error);
      return;
    }
    setPayment('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  return (
    <Screen edges={{ top: true }}>
      <View style={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.lg }}>
        <PageHeader
          eyebrow="Deuda"
          title={debt.name}
          onBack={() => router.back()}
          action={
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <HeaderIconButton icon="pencil" label="Editar deuda" color="brand" onPress={() => router.push({ pathname: '/deudas/nueva', params: { id: debt.id } })} />
              <HeaderIconButton icon="trash-2" label="Eliminar deuda" onPress={confirmDelete} />
            </View>
          }
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: 0, gap: theme.spacing.xl }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Card variant="highlight">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <View style={{ width: 48, height: 48, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface.interactive, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={DEBT_KIND_ICONS[debt.kind]} size={22} color="brand" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="label" color="muted">Saldo pendiente</Text>
              <Money amount={debt.balance} size="large" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: theme.spacing.xl, marginTop: theme.spacing.lg }}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="muted">Tipo</Text>
              <Text variant="bodyStrong">{DEBT_KIND_LABELS[debt.kind]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="muted">Tasa anual</Text>
              <Text variant="bodyStrong">{Math.round(debt.annualRate * 100)}%</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="muted">Vence</Text>
              <Text variant="bodyStrong">día {debt.dueDay}</Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text variant="label" color="muted" style={{ marginBottom: theme.spacing.md }}>
            Tu camino para salir
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text variant="body" color="secondary" style={{ flex: 1 }}>
              Pagando la cuota mínima de {formatMoney(debt.minimumPayment, { withSymbol: false })}
            </Text>
            <Text variant="bodyStrong" color={base.months == null ? 'warning' : 'primary'}>
              {monthsLabel(base.months)}
            </Text>
          </View>
          {base.months != null && base.months > 0 ? (
            <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.xs }}>
              En intereses pagarías aprox. {formatMoney(base.totalInterest)}
            </Text>
          ) : null}
          {base.months == null ? (
            <Animated.View entering={theme.reducedMotion ? undefined : FadeIn} style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
              <Icon name="lightbulb" size={16} color="warning" />
              <Text variant="caption" color="secondary" style={{ flex: 1 }}>
                Tu cuota mínima no alcanza a cubrir los intereses, por eso el saldo no baja. Mover el slider de abajo te muestra cuánto cambia con un poco más.
              </Text>
            </Animated.View>
          ) : null}

          <View style={{ marginTop: theme.spacing.xl }}>
            <ScenarioSlider
              label="Pago extra al mes"
              min={0}
              max={sliderMax}
              step={25}
              value={extra}
              onChange={(v) => {
                setExtra(v);
                Haptics.selectionAsync().catch(() => {});
              }}
              formatValue={(v) => `S/ ${v}`}
            />
          </View>

          {scenario && scenario.monthsSaved > 0 ? (
            <Animated.View entering={theme.reducedMotion ? undefined : FadeIn} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
              <Icon name="sparkles" size={16} color="positive" />
              <Text variant="body" color="secondary" style={{ flex: 1 }}>
                Con S/ {extra} más al mes terminas <Text variant="bodyStrong" color="positive">~{scenario.monthsSaved} meses</Text> antes y ahorras <Text variant="bodyStrong" color="positive">{formatMoney(scenario.interestSaved)}</Text> en intereses.
              </Text>
            </Animated.View>
          ) : null}
        </Card>

        <Card>
          <Text variant="label" color="muted" style={{ marginBottom: theme.spacing.md }}>
            Registrar un pago
          </Text>
          <TextField label="Monto" prefix="S/" placeholder="0.00" keyboardType="decimal-pad" value={payment} onChangeText={setPayment} />
          <View style={{ marginTop: theme.spacing.md }}>
            <Button label="Registrar pago" icon="check" fullWidth disabled={!canPay} onPress={onPay} />
          </View>
          {paymentValue > toMajor(debt.balance) ? (
            <Text variant="caption" color="warning" style={{ marginTop: theme.spacing.sm }}>
              El pago no puede ser mayor al saldo pendiente.
            </Text>
          ) : null}
          {paymentValue > toMajor(currentBalance) ? (
            <Text variant="caption" color="warning" style={{ marginTop: theme.spacing.sm }}>
              Tu saldo disponible es {formatMoney(currentBalance)}.
            </Text>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}
