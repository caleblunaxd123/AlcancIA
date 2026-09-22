import { View } from 'react-native';

import { AlcanciaMascot, type MascotMood } from '@/components/financial/AlcanciaMascot';
import { Button } from './Button';
import { Text } from './Text';
import { useTheme } from '@/theme';

export type EmptyStateProps = {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  mood?: MascotMood;
};

/** Friendly empty state (§33). Never a blank page — always a next step. */
export function EmptyState({ title, body, actionLabel, onAction, mood = 'sleeping' }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: theme.spacing.xxl, paddingVertical: theme.spacing.giant, gap: theme.spacing.lg }}>
      <AlcanciaMascot mood={mood} size={120} />
      <Text variant="subtitle" center>
        {title}
      </Text>
      <Text variant="body" color="secondary" center>
        {body}
      </Text>
      {actionLabel ? <Button label={actionLabel} onPress={onAction} icon="plus" /> : null}
    </View>
  );
}
