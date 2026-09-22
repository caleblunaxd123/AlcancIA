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
import type { SafeToSpendResult } from '@/engine/safeToSpend';
import { useTheme } from '@/theme';

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

      <BottomSheet visible={showBreakdown} onClose={() => setShowBreakdown(false)} title="¿Cómo lo calculamos?">
        <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
          Partimos de tu saldo y reservamos lo que ya tiene destino. Lo que queda es lo que puedes gastar con tranquilidad.
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
              <Text variant="caption" color="muted">
                {line.certainty === 'real' ? 'Confirmado' : line.certainty === 'scheduled' ? 'Programado' : 'Estimado'}
              </Text>
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
          <Text variant="subtitle">Disponible</Text>
          <Text variant="moneyMedium" color="positive">
            {formatMoney(result.amount)}
          </Text>
        </View>
      </BottomSheet>
    </Card>
  );
}
