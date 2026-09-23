import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BottomSheet } from '@/components/common/BottomSheet';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { MoneyCounter } from './MoneyCounter';
import { formatMoney, toMajor } from '@/engine/money';
import type { SafeToSpendLine, SafeToSpendResult } from '@/engine/safeToSpend';
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
  return (
    <BottomSheet visible={visible} onClose={onClose} title="¿Cómo lo calculamos?">
        <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
          Partimos de tu saldo y apartamos lo que ya tiene destino (pagos, ahorro y un colchón). Lo que queda es lo que puedes gastar tranquilo.
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
          <Text variant="subtitle">Puedes gastar</Text>
          <Text variant="moneyMedium" color="positive">
            {formatMoney(result.amount)}
          </Text>
        </View>

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
