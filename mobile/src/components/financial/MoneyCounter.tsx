import { useEffect } from 'react';
import { TextInput, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/common/Text';
import { CURRENCY_META } from '@/types/money';
import { useTheme } from '@/theme';
import type { CurrencyCode } from '@/types/money';
import type { TypographyVariant } from '@/theme/typography';

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export type MoneyCounterProps = {
  /** Target value in major units. */
  value: number;
  currency?: CurrencyCode;
  variant?: TypographyVariant;
  color?: 'primary' | 'positive' | 'negative' | 'onBrand' | 'brand';
  /** Duration override in ms. */
  duration?: number;
};

const COLOR_TOKENS = {
  primary: 'text.primary',
  positive: 'money.positive',
  negative: 'money.negative',
  onBrand: 'text.onBrand',
  brand: 'brand.primary',
} as const;

/**
 * Animated money counter (§35). Interpolates from the previous value to the new
 * one, honoring reduced-motion. Uses an animated TextInput so the tween runs on
 * the UI thread without per-frame React re-renders.
 */
export function MoneyCounter({
  value,
  currency = 'PEN',
  variant = 'moneyLarge',
  color = 'primary',
  duration = 900,
}: MoneyCounterProps) {
  const theme = useTheme();
  const progress = useSharedValue(0);
  const meta = CURRENCY_META[currency];

  useEffect(() => {
    progress.value = value;
  }, [value, progress]);

  const animated = useDerivedValue(() => {
    return theme.reducedMotion
      ? value
      : withTiming(progress.value, { duration });
  }, [value, duration, theme.reducedMotion]);

  const animatedProps = useAnimatedProps(() => {
    const formatted = animated.value.toLocaleString('es-PE', {
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    });
    return { text: `${meta.symbol} ${formatted}`, defaultValue: `${meta.symbol} ${formatted}` } as never;
  });

  const [colorGroup, colorKey] = COLOR_TOKENS[color].split('.') as [
    keyof typeof theme.colors,
    string,
  ];
  const resolvedColor =
    (theme.colors[colorGroup] as Record<string, string>)[colorKey] ?? theme.colors.text.primary;

  return (
    <View accessibilityRole="text" accessible>
      {/* Screen readers get the final value, not the intermediate tween. */}
      <Text
        variant={variant}
        style={{ position: 'absolute', opacity: 0 }}
        accessibilityLabel={`${meta.symbol} ${value.toFixed(meta.decimals)}`}
      >
        {' '}
      </Text>
      <AnimatedTextInput
        editable={false}
        underlineColorAndroid="transparent"
        importantForAccessibility="no"
        style={[
          theme.typography[variant],
          {
            color: resolvedColor,
            padding: 0,
            margin: 0,
          },
        ]}
        animatedProps={animatedProps}
      />
    </View>
  );
}
