/** Goal projection math (§15). Deterministic. */
import { subtract, toMajor } from './money';
import type { Goal } from '@/types/domain';
import { addDays, toISODate } from '@/utils/date';

export type GoalProjection = {
  progress: number; // 0..1
  remaining: ReturnType<typeof subtract>;
  /** Projected completion ISO date at current monthly contribution, or null. */
  etaDate: string | null;
  monthsRemaining: number | null;
};

export function projectGoal(goal: Goal, asOf: Date = new Date()): GoalProjection {
  const progress =
    goal.target.minor > 0 ? Math.min(1, goal.saved.minor / goal.target.minor) : 0;
  const remaining = subtract(goal.target, goal.saved);

  if (goal.monthlyContribution.minor <= 0 || remaining.minor <= 0) {
    return {
      progress,
      remaining,
      etaDate: remaining.minor <= 0 ? toISODate(asOf) : null,
      monthsRemaining: remaining.minor <= 0 ? 0 : null,
    };
  }

  const monthsRemaining = Math.ceil(remaining.minor / goal.monthlyContribution.minor);
  const etaDate = toISODate(addDays(asOf, Math.round(monthsRemaining * 30.44)));
  return { progress, remaining, etaDate, monthsRemaining };
}

/** How much sooner the goal arrives with an extra monthly contribution. */
export function projectWithExtra(
  goal: Goal,
  extraMajor: number,
  asOf: Date = new Date(),
): GoalProjection {
  const boosted: Goal = {
    ...goal,
    monthlyContribution: {
      ...goal.monthlyContribution,
      minor: goal.monthlyContribution.minor + Math.round(extraMajor * 100),
    },
  };
  return projectGoal(boosted, asOf);
}

export function daysSooner(base: GoalProjection, boosted: GoalProjection): number {
  if (!base.etaDate || !boosted.etaDate) return 0;
  const ms = new Date(base.etaDate).getTime() - new Date(boosted.etaDate).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function goalMajorRemaining(goal: Goal): number {
  return toMajor(subtract(goal.target, goal.saved));
}
