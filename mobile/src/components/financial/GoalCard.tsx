import { Pressable, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { AnimatedProgress } from './AnimatedProgress';
import { formatMoney } from '@/engine/money';
import { projectGoal } from '@/engine/goals';
import { useTheme } from '@/theme';
import type { Goal, GoalKind } from '@/types/domain';
import { formatMonthYear } from '@/utils/date';

const GOAL_ICON: Record<GoalKind, string> = {
  home: 'house',
  travel: 'plane',
  car: 'car',
  education: 'graduation-cap',
  emergency: 'shield',
  wedding: 'heart',
  tech: 'smartphone',
  pet: 'paw-print',
  custom: 'target',
};

export type GoalCardProps = {
  goal: Goal;
  onPress?: () => void;
  compact?: boolean;
};

export function GoalCard({ goal, onPress, compact = false }: GoalCardProps) {
  const theme = useTheme();
  const projection = projectGoal(goal);
  const pct = Math.round(projection.progress * 100);

  const body = (
    <Card variant="goal">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.brand.soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={GOAL_ICON[goal.kind]} size={22} color="brand" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="h3">{goal.name}</Text>
          <Text variant="caption" color="muted">
            {formatMoney(goal.saved, { hideDecimalsWhenRound: true })} de{' '}
            {formatMoney(goal.target, { hideDecimalsWhenRound: true })}
          </Text>
        </View>
        <Text variant="moneySmall" color="brand">
          {pct}%
        </Text>
      </View>

      <AnimatedProgress progress={projection.progress} />

      {!compact ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.md }}>
          <View>
            <Text variant="caption" color="muted">
              Al ritmo actual
            </Text>
            <Text variant="bodyStrong">
              {projection.etaDate ? formatMonthYear(projection.etaDate) : 'Define un aporte'}
            </Text>
          </View>
          {onPress ? <Icon name="chevron-right" size={20} color="muted" /> : null}
        </View>
      ) : null}
    </Card>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Meta ${goal.name}, ${pct} por ciento`}>
      {body}
    </Pressable>
  );
}
