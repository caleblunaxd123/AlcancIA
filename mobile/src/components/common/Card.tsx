import { LinearGradient } from 'expo-linear-gradient';
import { View, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export type CardVariant =
  | 'default'
  | 'highlight'
  | 'interactive'
  | 'success'
  | 'goal'
  | 'insight';

export type CardProps = ViewProps & {
  variant?: CardVariant;
  padded?: boolean;
  style?: ViewStyle | ViewStyle[];
};

/**
 * AlcanciaCard — the foundational surface. Navy fill, hair-thin border, high
 * radius, generous padding, restrained elevation. `highlight`/`goal`/`insight`
 * carry a subtle brand gradient wash.
 */
export function Card({ variant = 'default', padded = true, style, children, ...rest }: CardProps) {
  const theme = useTheme();

  const base: ViewStyle = {
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    backgroundColor: theme.colors.surface.primary,
    padding: padded ? theme.spacing.xl : 0,
    overflow: 'hidden',
  };

  const gradientFor: Partial<Record<CardVariant, [string, string]>> = {
    highlight: [theme.colors.brand.soft, 'transparent'],
    goal: [theme.colors.brand.soft, 'transparent'],
    insight: [
      theme.scheme === 'dark' ? 'rgba(66, 224, 181, 0.10)' : 'rgba(31, 184, 148, 0.08)',
      'transparent',
    ],
    success: [
      theme.scheme === 'dark' ? 'rgba(66, 224, 181, 0.14)' : 'rgba(31, 184, 148, 0.10)',
      'transparent',
    ],
  };

  const variantBorder: Partial<Record<CardVariant, string>> = {
    highlight: theme.colors.border.active,
    goal: theme.colors.border.active,
    interactive: theme.colors.border.strong,
  };

  const gradient = gradientFor[variant];

  return (
    <View
      style={[
        base,
        variantBorder[variant] ? { borderColor: variantBorder[variant] } : null,
        theme.elevation.sm,
        style,
      ]}
      {...rest}
    >
      {gradient ? (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
      {children}
    </View>
  );
}
