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
 * AlcanciaCard — the foundational surface, banking style: a clean white sheet
 * with a hair-thin border and a soft shadow. Color is reserved for what truly
 * matters, so hierarchy survives on a busy screen:
 *  - highlight: faint brand tint + brand border (the one thing to act on)
 *  - success:   faint positive tint
 *  - insight:   brand accent stripe on the leading edge
 *  - default / goal / interactive: plain surface
 */
export function Card({ variant = 'default', padded = true, style, children, ...rest }: CardProps) {
  const theme = useTheme();
  const light = theme.scheme === 'light';

  const base: ViewStyle = {
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    backgroundColor: theme.colors.surface.primary,
    padding: padded ? theme.spacing.xl : 0,
    overflow: 'hidden',
  };

  const variantStyle: Partial<Record<CardVariant, ViewStyle>> = {
    highlight: { borderColor: theme.colors.border.active },
    interactive: { borderColor: theme.colors.border.strong },
    success: { borderColor: theme.colors.border.active },
  };

  const tint: Partial<Record<CardVariant, string>> = {
    highlight: theme.colors.brand.soft,
    success: theme.colors.brand.soft,
  };

  const shadow: ViewStyle = light
    ? {
        shadowColor: '#0F1B2D',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }
    : theme.elevation.sm;

  return (
    <View style={[base, variantStyle[variant], shadow, style]} {...rest}>
      {tint[variant] ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: tint[variant] }}
        />
      ) : null}
      {variant === 'insight' ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 4, backgroundColor: theme.colors.brand.primary }}
        />
      ) : null}
      {children}
    </View>
  );
}
