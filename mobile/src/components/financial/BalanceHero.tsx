import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { MoneyCounter } from './MoneyCounter';
import { formatMoney, toMajor } from '@/engine/money';
import type { Money } from '@/types/money';
import { useTheme } from '@/theme';

export type BalanceHeroProps = {
  balance: Money;
  saved: Money;
  spentThisMonth: Money;
};

type QuickAction = { label: string; icon: string; href: string };

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Registrar', icon: 'plus', href: '/movimiento/nuevo' },
  { label: 'Metas', icon: 'target', href: '/(tabs)/metas' },
  { label: '¿Lo compro?', icon: 'shield-check', href: '/puedo-comprarlo' },
  { label: 'AlcancIA', icon: 'sparkles', href: '/(tabs)/ia' },
];

/**
 * The bank-style anchor of Home: what you have, split into what's saved and
 * what's already gone this month, plus the four actions a user can take from
 * anywhere. Amounts can be hidden with one tap for shoulder-surfing privacy.
 */
export function BalanceHero({ balance, saved, spentThisMonth }: BalanceHeroProps) {
  const theme = useTheme();
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const mask = (m: Money) => (hidden ? '••••' : formatMoney(m, { hideDecimalsWhenRound: true }));

  return (
    <Card variant="highlight">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          <Icon name="wallet" size={16} color="brand" />
          <Text variant="label" color="brand">Saldo disponible</Text>
        </View>
        <Pressable
          onPress={() => setHidden((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Mostrar montos' : 'Ocultar montos'}
          accessibilityState={{ checked: hidden }}
          hitSlop={8}
          style={{ minHeight: 32, minWidth: 32, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name={hidden ? 'eye-off' : 'eye'} size={18} color="muted" />
        </Pressable>
      </View>

      {hidden ? (
        <Text variant="displayMoney" style={{ marginTop: theme.spacing.xs }}>••••</Text>
      ) : (
        <View style={{ marginTop: theme.spacing.xs }}>
          <MoneyCounter value={toMajor(balance)} currency={balance.currency} variant="displayMoney" color="primary" />
        </View>
      )}

      <View
        style={{
          flexDirection: 'row',
          gap: theme.spacing.md,
          marginTop: theme.spacing.lg,
          paddingTop: theme.spacing.lg,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border.subtle,
        }}
      >
        <Stat icon="piggy-bank" label="Ahorrado en metas" value={mask(saved)} tone="info" />
        <View style={{ width: 1, backgroundColor: theme.colors.border.subtle }} />
        <Stat icon="trending-down" label="Gastado este mes" value={mask(spentThisMonth)} tone="muted" />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.xl }}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => router.push(action.href as never)}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={({ pressed }) => ({
              alignItems: 'center',
              gap: theme.spacing.xs,
              minWidth: 64,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.surface.secondary,
                borderWidth: 1,
                borderColor: theme.colors.border.subtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={action.icon} size={21} color="brand" />
            </View>
            <Text variant="caption" color="secondary">
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

function Stat({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: 'info' | 'muted' }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
        <Icon name={icon} size={13} color={tone === 'info' ? 'brand' : 'muted'} />
        <Text variant="caption" color="muted" numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text variant="moneySmall">{value}</Text>
    </View>
  );
}
