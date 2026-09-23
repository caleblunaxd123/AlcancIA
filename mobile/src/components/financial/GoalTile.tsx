import { Pressable, View } from 'react-native';

import { Text } from '@/components/common/Text';
import { AnimatedProgress } from './AnimatedProgress';
import { GoalCover } from './GoalCover';
import { projectGoal } from '@/engine/goals';
import { formatMoney } from '@/engine/money';
import { useTheme } from '@/theme';
import type { Goal } from '@/types/domain';

/** Compact goal card for horizontal carousels (Home). Full detail lives in /meta/[id]. */
export function GoalTile({ goal, onPress, width = 220 }: { goal: Goal; onPress: () => void; width?: number }) {
  const theme = useTheme();
  const projection = projectGoal(goal);
  const pct = Math.round(projection.progress * 100);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Meta ${goal.name}: ${pct} por ciento. Toca para aportar o ver detalle.`}
      style={({ pressed }) => ({
        width,
        borderRadius: theme.radius.xl,
        overflow: 'hidden',
        backgroundColor: theme.colors.surface.primary,
        borderWidth: 1,
        borderColor: theme.colors.border.subtle,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <GoalCover kind={goal.kind} height={86} progress={projection.progress} />
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
          <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
            {goal.name}
          </Text>
          <Text variant="bodyStrong" color="brand">{pct}%</Text>
        </View>
        <Text variant="caption" color="secondary" numberOfLines={1}>
          {formatMoney(goal.saved, { hideDecimalsWhenRound: true })} de {formatMoney(goal.target, { hideDecimalsWhenRound: true })}
        </Text>
        <AnimatedProgress progress={projection.progress} height={6} />
      </View>
    </Pressable>
  );
}
