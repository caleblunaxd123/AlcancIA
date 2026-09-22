import { Pressable, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { formatMoney } from '@/engine/money';
import { useTheme } from '@/theme';
import type { Money } from '@/types/money';

export type UpcomingPaymentProps = {
  label: string;
  amount: Money;
  whenLabel: string;
  icon?: string;
  onPress?: () => void;
};

export function UpcomingPayment({ label, amount, whenLabel, icon = 'credit-card', onPress }: UpcomingPaymentProps) {
  const theme = useTheme();
  const body = (
    <Card variant={onPress ? 'interactive' : 'default'}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surface.interactive,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={22} color="secondary" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="h3">{label}</Text>
          <Text variant="caption" color="muted">
            {whenLabel}
          </Text>
        </View>
        <Text variant="moneyMedium">{formatMoney(amount, { hideDecimalsWhenRound: true })}</Text>
        {onPress ? <Icon name="chevron-right" size={18} color="muted" /> : null}
      </View>
    </Card>
  );

  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Ver calendario financiero" onPress={onPress}>
      {body}
    </Pressable>
  );
}
