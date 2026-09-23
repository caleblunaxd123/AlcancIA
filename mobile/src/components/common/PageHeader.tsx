import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from './Icon';
import { Text } from './Text';
import { useTheme } from '@/theme';

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: string;
  onBack?: () => void;
  action?: ReactNode;
};

/** 44px circular icon control for header actions (§50/§53 touch targets). */
export function HeaderIconButton({
  icon,
  label,
  onPress,
  color = 'secondary',
}: {
  icon: string;
  label: string;
  onPress: () => void;
  color?: 'brand' | 'secondary' | 'muted';
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface.primary,
        borderWidth: 1,
        borderColor: theme.colors.border.subtle,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={20} color={color} />
    </Pressable>
  );
}

/**
 * Shared screen header, banking style: ONE row — back control or section icon,
 * the plain name of the screen, and an optional action — with a short line
 * underneath that tells the user what they can do here. Compact on purpose so
 * content starts high on the screen (the old stacked header ate ~25% of it).
 *
 * `eyebrow` is optional context shown in small caps above the title.
 */
export function PageHeader({ title, subtitle, eyebrow, icon, onBack, action }: Props) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={10}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.surface.primary,
            borderWidth: 1,
            borderColor: theme.colors.border.subtle,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon name="arrow-left" size={20} color="primary" />
        </Pressable>
      ) : icon ? (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.brand.soft,
          }}
        >
          <Icon name={icon} size={22} color="brand" />
        </View>
      ) : null}

      <View style={{ flex: 1, gap: 2 }}>
        {eyebrow ? (
          <Text variant="label" color="muted" numberOfLines={1} style={{ fontSize: 11, letterSpacing: 0.8 }}>
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="title" accessibilityRole="header" numberOfLines={2} style={{ fontSize: 22, lineHeight: 28 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="secondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {action ?? null}
    </View>
  );
}
