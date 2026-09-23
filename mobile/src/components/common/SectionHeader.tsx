import { Pressable, View } from 'react-native';

import { Icon } from './Icon';
import { Text } from './Text';
import { useTheme } from '@/theme';

export type SectionHeaderProps = {
  title: string;
  /** Optional one-line explanation of what the section is for. */
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Section title in sentence case (readable, banking style) with an optional "Ver todo" link. */
export function SectionHeader({ title, subtitle, actionLabel, onAction }: SectionHeaderProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text variant="subtitle" accessibilityRole="header" style={{ fontSize: 17, lineHeight: 22 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          hitSlop={10}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            minHeight: 32,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text variant="bodyStrong" color="brand" style={{ fontSize: 14 }}>
            {actionLabel}
          </Text>
          <Icon name="chevron-right" size={16} color="brand" />
        </Pressable>
      ) : null}
    </View>
  );
}
