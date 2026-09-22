import type { ComponentType } from 'react';
import * as Lucide from 'lucide-react-native';
import type { LucideProps } from 'lucide-react-native';

import { useTheme } from '@/theme';
import type { ColorTokens } from '@/theme/tokens';

type IconColor =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'brand'
  | 'positive'
  | 'negative'
  | 'warning'
  | 'onBrand'
  | 'onAccent';

/** Convert a kebab-case lucide name to its PascalCase component key. */
function toPascal(name: string): string {
  return name
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

function resolve(colors: ColorTokens, c: IconColor): string {
  switch (c) {
    case 'primary':
      return colors.text.primary;
    case 'secondary':
      return colors.text.secondary;
    case 'muted':
      return colors.text.muted;
    case 'brand':
      return colors.brand.primary;
    case 'positive':
      return colors.money.positive;
    case 'negative':
      return colors.money.negative;
    case 'warning':
      return colors.status.warning;
    case 'onBrand':
      return colors.text.onBrand;
    case 'onAccent':
      return colors.text.onAccent;
  }
}

const iconMap = Lucide as unknown as Record<string, ComponentType<LucideProps>>;

export type IconProps = Omit<LucideProps, 'color'> & {
  name: string;
  size?: number;
  color?: IconColor;
  /** Override with a raw color string when a token doesn't fit. */
  rawColor?: string;
};

export function Icon({ name, size = 20, color = 'primary', rawColor, ...rest }: IconProps) {
  const theme = useTheme();
  const LucideIcon = iconMap[toPascal(name)] ?? iconMap.CircleDashed;
  if (!LucideIcon) return null;
  return (
    <LucideIcon
      size={size}
      color={rawColor ?? resolve(theme.colors, color)}
      strokeWidth={2}
      {...rest}
    />
  );
}
