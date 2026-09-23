import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import type { NextStep } from '@/engine/nextStep';
import { useTheme } from '@/theme';

export type NextStepCardProps = {
  step: NextStep;
};

/**
 * The permanent "what do I do now" answer. Unlike the first-run checklist this
 * never disappears: it always shows exactly ONE concrete action derived from
 * the real account state, so Home is never a dead end.
 */
export function NextStepCard({ step }: NextStepCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const go = () => router.push(step.href as never);

  return (
    <Card variant="highlight">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.md }}>
        <Icon name="compass" size={15} color="brand" />
        <Text variant="label" color="brand">Tu siguiente paso</Text>
      </View>

      <Pressable
        onPress={go}
        accessibilityRole="button"
        accessibilityLabel={`${step.title}. ${step.actionLabel}`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.lg,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.brand.soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={step.icon} size={22} color="brand" />
        </View>
        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <Text variant="subtitle">{step.title}</Text>
          <Text variant="caption" color="secondary">
            {step.body}
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color="muted" />
      </Pressable>

      <View style={{ marginTop: theme.spacing.lg }}>
        <Button label={step.actionLabel} onPress={go} />
      </View>
    </Card>
  );
}
