import { Pressable, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { formatMoney } from '@/engine/money';
import { useTheme } from '@/theme';
import type { Money } from '@/types/money';

export type UpcomingItem = { label: string; amount: Money; whenLabel: string; icon: string };

/** "Próximos pagos" — one card, one row per payment, like a bank's due-dates list. */
export function UpcomingList({ items, onPress }: { items: UpcomingItem[]; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityHint="Abre el calendario de pagos">
      <Card padded={false}>
        {items.map((item, i) => {
          const soon = item.whenLabel === 'hoy' || item.whenLabel === 'mañana';
          return (
            <View
              key={`${item.label}-${i}`}
              accessible
              accessibilityLabel={`${item.label}, ${formatMoney(item.amount)}, ${item.whenLabel}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.lg,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: theme.colors.border.subtle,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.surface.interactive,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={item.icon} size={19} color="secondary" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>{item.label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {soon ? <Icon name="clock" size={12} color="warning" /> : null}
                  <Text variant="caption" color={soon ? 'warning' : 'secondary'}>
                    {item.whenLabel.charAt(0).toUpperCase() + item.whenLabel.slice(1)}
                  </Text>
                </View>
              </View>
              <Text variant="moneySmall">{formatMoney(item.amount, { hideDecimalsWhenRound: true })}</Text>
            </View>
          );
        })}
      </Card>
    </Pressable>
  );
}
