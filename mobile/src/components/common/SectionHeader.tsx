import { Pressable, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from '@/theme';

export type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
      }}
    >
      <Text variant="label" color="muted">
        {title}
      </Text>
      {actionLabel ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text variant="bodyStrong" color="brand">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
