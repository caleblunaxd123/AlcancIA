import { View } from 'react-native';

import { Text } from '@/components/common/Text';
import { moneyParts } from '@/engine/money';
import { useTheme } from '@/theme';
import type { Money as MoneyType } from '@/types/money';

type MoneySize = 'display' | 'large' | 'medium' | 'small';

const VARIANT = {
  display: { main: 'displayMoney', affix: 'moneyMedium' },
  large: { main: 'moneyLarge', affix: 'moneySmall' },
  medium: { main: 'moneyMedium', affix: 'moneySmall' },
  small: { main: 'moneySmall', affix: 'caption' },
} as const;

export type MoneyProps = {
  amount: MoneyType;
  size?: MoneySize;
  color?: 'primary' | 'positive' | 'negative' | 'onBrand' | 'brand';
  showDecimals?: boolean;
};

/** Money with a smaller symbol and de-emphasized decimals for a premium feel. */
export function Money({ amount, size = 'medium', color = 'primary', showDecimals = true }: MoneyProps) {
  const theme = useTheme();
  const parts = moneyParts(amount);
  const v = VARIANT[size];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }} accessible accessibilityRole="text">
      <Text variant={v.affix} color={color} style={{ marginRight: theme.spacing.xs }}>
        {parts.sign}
        {parts.symbol}
      </Text>
      <Text variant={v.main} color={color}>
        {parts.integer}
      </Text>
      {showDecimals ? (
        <Text variant={v.affix} color={color} style={{ opacity: 0.7 }}>
          .{parts.decimals}
        </Text>
      ) : null}
    </View>
  );
}
