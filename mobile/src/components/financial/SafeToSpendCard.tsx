import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BottomSheet } from '@/components/common/BottomSheet';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { MoneyCounter } from './MoneyCounter';
import { computeAllocation } from '@/engine/allocation';
import { formatMoney, money, toMajor } from '@/engine/money';
import type { SafeToSpendLine, SafeToSpendResult } from '@/engine/safeToSpend';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';
import { formatDayMonth } from '@/utils/date';

export type SafeToSpendCardProps = {
  result: SafeToSpendResult;
  onAskCanIBuy?: () => void;
};

export function SafeToSpendCard({ result, onAskCanIBuy }: SafeToSpendCardProps) {
  const theme = useTheme();
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <Card variant="highlight">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.sm }}>
        <Icon name="shield-check" size={16} color="brand" />
        <Text variant="label" color="brand">
          Dinero seguro para gastar
        </Text>
      </View>

      <MoneyCounter
        value={toMajor(result.amount)}
        currency={result.currency}
        variant="displayMoney"
        color="primary"
      />

      <Text variant="body" color="secondary" style={{ marginTop: theme.spacing.xs }}>
        Disponible sin afectar tus planes
      </Text>
      <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.xxs }}>
        {result.nextIncomeDate
          ? `Hasta tu próximo ingreso en ${result.daysUntilIncome} día${result.daysUntilIncome === 1 ? '' : 's'}`
          : 'Estimado para los próximos 30 días'}
      </Text>

      <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.md }}>
        <Button
          label="¿Puedo comprarlo?"
          icon="sparkles"
          size="lg"
          fullWidth
          onPress={onAskCanIBuy}
        />
        <Pressable
          onPress={() => setShowBreakdown(true)}
          accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs }}
          hitSlop={8}
        >
          <Icon name="calculator" size={14} color="muted" />
          <Text variant="caption" color="muted">
            ¿Cómo lo calculamos?
          </Text>
        </Pressable>
      </View>

      <SafeToSpendBreakdownSheet visible={showBreakdown} onClose={() => setShowBreakdown(false)} result={result} />
    </Card>
  );
}

function MonthRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <Text variant={strong ? 'bodyStrong' : 'body'} style={{ flex: 1 }}>{label}</Text>
      <Text variant={strong ? 'bodyStrong' : 'body'} color={strong ? 'brand' : 'primary'}>{value}</Text>
    </View>
  );
}

/** Plain-language reason for each line, instead of "Confirmado/Programado". */
function lineCaption(line: SafeToSpendLine): string {
  if (line.key === 'balance') return 'Lo que tienes hoy';
  if (line.key === 'buffer') return 'Colchón para imprevistos';
  if (line.key === 'savings') return 'Para tus metas de ahorro';
  if (line.key === 'essentials') return 'Estimado según tus gastos de comida y transporte';
  if (line.key === 'subscriptions') return 'Se renuevan antes de tu ingreso';
  if (line.key.startsWith('debt-')) return 'Cuota que vence antes de tu ingreso';
  return 'Vence antes de tu próximo ingreso';
}

/**
 * "¿Cómo lo calculamos?" — itemizes every line the deterministic engine used,
 * so the user can always see why their safe-to-spend is what it is (§85).
 */
export function SafeToSpendBreakdownSheet({
  visible,
  onClose,
  result,
}: {
  visible: boolean;
  onClose: () => void;
  result: SafeToSpendResult;
}) {
  const theme = useTheme();
  const snapshot = useFinancialStore((s) => s.snapshot);
  const month = useMemo(() => computeAllocation(snapshot), [snapshot]);
  const fixedMinor = month.slices.find((s) => s.id === 'obligations')?.amount.minor ?? 0;
  const monthLeft = money(month.income.minor - fixedMinor, month.currency);
  return (
    <BottomSheet visible={visible} onClose={onClose} title="¿Cómo lo calculamos?">
        <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
          Partimos del dinero que tienes hoy y apartamos lo que debes pagar antes de tu próximo ingreso (pagos, ahorro y un colchón). Lo que queda es lo que puedes gastar tranquilo.
        </Text>
        {result.breakdown.map((line, i) => (
          <Animated.View
            key={line.key}
            entering={theme.reducedMotion ? undefined : FadeInDown.delay(i * 40).duration(theme.motion.normal)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: theme.spacing.sm,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border.subtle,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{line.label}</Text>
              <Text variant="caption" color="muted">{lineCaption(line)}</Text>
            </View>
            <Text
              variant="moneySmall"
              color={line.direction === 'add' ? 'positive' : 'primary'}
            >
              {line.direction === 'add' ? '' : '−'}
              {formatMoney(line.amount, { hideDecimalsWhenRound: true })}
            </Text>
          </Animated.View>
        ))}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: theme.spacing.md,
          }}
        >
          <Text variant="subtitle">{result.clamped ? 'Te faltan' : 'Puedes gastar'}</Text>
          <Text variant="moneyMedium" color={result.clamped ? 'negative' : 'positive'}>
            {formatMoney(result.clamped ? result.shortfall : result.amount)}
          </Text>
        </View>
        {result.clamped ? (
          <Text variant="caption" color="secondary" style={{ marginTop: theme.spacing.xs }}>
            Lo que tienes hoy no alcanza para los pagos que vienen antes de que cobres. Si tu saldo real es mayor, regístralo como ingreso; si no, esos pagos saldrán de tu próximo sueldo.
          </Text>
        ) : null}

        {!month.incomeUnknown ? (
          <View style={{ marginTop: theme.spacing.lg, padding: theme.spacing.md, borderRadius: theme.radius.lg, backgroundColor: theme.colors.brand.soft, gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              <Icon name="calendar-range" size={16} color="brand" />
              <Text variant="bodyStrong">Tu mes completo</Text>
            </View>
            <MonthRow label="Ingresas" value={formatMoney(month.income, { hideDecimalsWhenRound: true })} />
            <MonthRow label="Pagos fijos, deudas y suscripciones" value={`−${formatMoney(money(fixedMinor, month.currency), { hideDecimalsWhenRound: true })}`} />
            <MonthRow label="Te queda para gastar y ahorrar" value={formatMoney(monthLeft, { hideDecimalsWhenRound: true })} strong />
            <Text variant="caption" color="secondary">
              Ese dinero llega con tu sueldo{result.nextIncomeDate ? ` (${formatDayMonth(result.nextIncomeDate)})` : ''}. Lo de arriba es lo que puedes usar hoy, con el dinero que ya tienes.
            </Text>
          </View>
        ) : null}

        {result.coveredByNextIncome.length > 0 ? (
          <View
            style={{
              marginTop: theme.spacing.lg,
              padding: theme.spacing.md,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.surface.secondary,
              gap: theme.spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              <Icon name="calendar-check" size={16} color="brand" />
              <Text variant="bodyStrong">Los paga tu próximo ingreso</Text>
            </View>
            <Text variant="caption" color="secondary">
              Vencen después de que cobres{result.nextIncomeDate ? ` (${formatDayMonth(result.nextIncomeDate)})` : ''}, así que no los descontamos de lo que tienes hoy.
            </Text>
            {result.coveredByNextIncome.map((p) => (
              <View key={p.key} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="body">
                  {p.label} · {formatDayMonth(p.dueDate)}
                </Text>
                <Text variant="moneySmall">{formatMoney(p.amount, { hideDecimalsWhenRound: true })}</Text>
              </View>
            ))}
          </View>
        ) : null}
    </BottomSheet>
  );
}
