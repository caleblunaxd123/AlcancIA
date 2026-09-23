import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { FinancialWeather } from './FinancialWeather';
import { MoneyCounter } from './MoneyCounter';
import { SafeToSpendBreakdownSheet } from './SafeToSpendCard';
import { formatMoney, subtract, toMajor } from '@/engine/money';
import type { WeatherResult } from '@/engine/weather';
import { useTheme } from '@/theme';
import type { Money } from '@/types/money';
import { personalGreeting, todayLabel } from '@/utils/greeting';

export type HomeHeroProps = {
  name: string;
  weather: WeatherResult;
  balance: Money;
  onOpenMenu: () => void;
};

/**
 * Bank-style brand band at the top of Home. It answers ONE question in big
 * type — "how much can I spend?" — and explains in a single line how that
 * relates to the total balance, so the two numbers never compete.
 */
export function HomeHero({ name, weather, balance, onOpenMenu }: HomeHeroProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [hidden, setHidden] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const sts = weather.safeToSpend;
  const reserved = subtract(balance, sts.amount);
  const hasIncome = Boolean(sts.nextIncomeDate);
  const mask = (m: Money) => (hidden ? 'S/ ••••' : formatMoney(m, { hideDecimalsWhenRound: true }));
  const initial = (name.trim().charAt(0) || 'A').toUpperCase();

  return (
    <LinearGradient
      colors={[theme.colors.hero.from, theme.colors.hero.to]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingTop: insets.top + theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        // Leaves room for the quick-actions card that overlaps the band.
        paddingBottom: theme.spacing.giant + theme.spacing.xl,
        borderBottomLeftRadius: theme.radius.xxl,
        borderBottomRightRadius: theme.radius.xxl,
      }}
    >
      {/* Greeting row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: theme.colors.hero.chip,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="subtitle" style={{ color: theme.colors.hero.text }}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="caption" style={{ color: theme.colors.hero.textMuted }} numberOfLines={1}>
            {todayLabel()}
          </Text>
          <Text
            variant="title"
            accessibilityRole="header"
            numberOfLines={1}
            style={{ color: theme.colors.hero.text, fontSize: 22, lineHeight: 28 }}
          >
            {personalGreeting(name)}
          </Text>
        </View>
        <Pressable
          onPress={onOpenMenu}
          accessibilityRole="button"
          accessibilityLabel="Mi cuenta y herramientas"
          hitSlop={6}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: theme.colors.hero.chip,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon name="layout-grid" size={20} rawColor={theme.colors.hero.text} />
        </Pressable>
      </View>

      <View style={{ marginTop: theme.spacing.lg }}>
        <FinancialWeather weather={weather} tone="hero" />
      </View>

      {/* The one number that matters */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="body" style={{ color: theme.colors.hero.textMuted }}>
            {hasIncome
              ? `Puedes gastar hasta tu próximo ingreso`
              : 'Puedes gastar este mes'}
          </Text>
          <Pressable
            onPress={() => setHidden((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar montos' : 'Ocultar montos'}
            hitSlop={10}
            style={{ minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}
          >
            <Icon name={hidden ? 'eye-off' : 'eye'} size={20} rawColor={theme.colors.hero.textMuted} />
          </Pressable>
        </View>

        {hidden ? (
          <Text variant="displayMoney" style={{ color: theme.colors.hero.text }}>S/ ••••</Text>
        ) : (
          <MoneyCounter value={toMajor(sts.amount)} currency={sts.currency} variant="displayMoney" color="hero" />
        )}

        <Text variant="caption" style={{ color: theme.colors.hero.textMuted, marginTop: theme.spacing.xs }}>
          {hasIncome
            ? `Faltan ${sts.daysUntilIncome} día${sts.daysUntilIncome === 1 ? '' : 's'} para tu ingreso · Saldo total ${mask(balance)}`
            : `Saldo total ${mask(balance)} · Registra tu ingreso para afinar el cálculo`}
        </Text>
        {reserved.minor > 0 ? (
          <Text variant="caption" style={{ color: theme.colors.hero.textMuted }}>
            Ya apartamos {mask(reserved)} para tus pagos, ahorro y un colchón.
          </Text>
        ) : null}

        <Pressable
          onPress={() => setShowBreakdown(true)}
          accessibilityRole="button"
          accessibilityLabel="Ver cómo calculamos cuánto puedes gastar"
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
            alignSelf: 'flex-start',
            marginTop: theme.spacing.md,
            minHeight: 36,
            paddingHorizontal: theme.spacing.md,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.hero.chip,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Icon name="calculator" size={15} rawColor={theme.colors.hero.text} />
          <Text variant="caption" style={{ color: theme.colors.hero.text }}>¿Cómo lo calculamos?</Text>
        </Pressable>
      </View>

      <SafeToSpendBreakdownSheet visible={showBreakdown} onClose={() => setShowBreakdown(false)} result={sts} />
    </LinearGradient>
  );
}
