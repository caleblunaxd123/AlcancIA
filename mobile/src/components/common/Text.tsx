import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '@/theme';
import type { TypographyVariant } from '@/theme/typography';
import type { ColorTokens } from '@/theme/tokens';

type TextColor =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'onBrand'
  | 'onAccent'
  | 'brand'
  | 'positive'
  | 'negative'
  | 'warning';

export type AppTextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: TextColor;
  center?: boolean;
};

function resolveColor(colors: ColorTokens, color: TextColor): string {
  switch (color) {
    case 'primary':
      return colors.text.primary;
    case 'secondary':
      return colors.text.secondary;
    case 'muted':
      return colors.text.muted;
    case 'onBrand':
      return colors.text.onBrand;
    case 'onAccent':
      return colors.text.onAccent;
    case 'brand':
      return colors.brand.primary;
    case 'positive':
      return colors.money.positive;
    case 'negative':
      return colors.money.negative;
    case 'warning':
      return colors.status.warning;
  }
}

export function Text({
  variant = 'body',
  color = 'primary',
  center,
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  return (
    <RNText
      style={[
        theme.typography[variant],
        { color: resolveColor(theme.colors, color) },
        center && { textAlign: 'center' },
        style,
      ]}
      {...rest}
    />
  );
}
