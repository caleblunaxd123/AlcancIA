import { View } from 'react-native';

import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { CATEGORIES } from '@/constants/categories';
import { formatMoney } from '@/engine/money';
import { useTheme } from '@/theme';
import type { Transaction } from '@/types/domain';

export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const theme = useTheme();
  const cat = CATEGORIES[transaction.category];
  const isIncome = transaction.kind === 'income';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.md }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: theme.radius.md,
          backgroundColor: isIncome ? theme.colors.brand.soft : theme.colors.surface.interactive,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={cat.icon} size={20} color={isIncome ? 'positive' : 'secondary'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{transaction.description}</Text>
        <Text variant="caption" color="muted">
          {cat.label}
        </Text>
      </View>
      <Text variant="moneySmall" color={isIncome ? 'positive' : 'primary'}>
        {isIncome ? '+' : '−'}
        {formatMoney(transaction.amount, { withSymbol: true })}
      </Text>
    </View>
  );
}
