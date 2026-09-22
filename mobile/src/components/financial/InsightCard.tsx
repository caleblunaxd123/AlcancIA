import { Pressable, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { useTheme } from '@/theme';

export type InsightCardProps = {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
};

/** AI/analytics insight surface (§20). Warm, specific, never shaming. */
export function InsightCard({ title, body, actionLabel, onAction, icon = 'sparkles' }: InsightCardProps) {
  const theme = useTheme();
  return (
    <Card variant="insight">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.sm }}>
        <Icon name={icon} size={16} color="positive" />
        <Text variant="label" color="positive">
          {title}
        </Text>
      </View>
      <Text variant="body" color="primary" style={{ lineHeight: 22 }}>
        {body}
      </Text>
      {actionLabel ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.md }}
        >
          <Text variant="bodyStrong" color="brand">
            {actionLabel}
          </Text>
          <Icon name="arrow-right" size={16} color="brand" />
        </Pressable>
      ) : null}
    </Card>
  );
}
