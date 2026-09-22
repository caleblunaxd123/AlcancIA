import { daysSooner, projectGoal, projectWithExtra } from '@/engine/goals';
import { fromMajor } from '@/engine/money';
import type { Goal } from '@/types/domain';

const goal: Goal = {
  id: 'g',
  kind: 'home',
  name: 'Depa',
  target: fromMajor(20000),
  saved: fromMajor(7240),
  monthlyContribution: fromMajor(800),
  priority: 'high',
};

const AS_OF = new Date('2026-01-01T12:00:00');

describe('projectGoal', () => {
  it('computes progress and remaining', () => {
    const p = projectGoal(goal, AS_OF);
    expect(p.progress).toBeCloseTo(0.362, 3);
    expect(p.remaining.minor).toBe(1276000);
  });

  it('estimates months remaining at current contribution', () => {
    const p = projectGoal(goal, AS_OF);
    // ceil(12760 / 800) = 16 months
    expect(p.monthsRemaining).toBe(16);
    expect(p.etaDate).not.toBeNull();
  });

  it('marks completed goals as done today', () => {
    const done = { ...goal, saved: fromMajor(20000) };
    const p = projectGoal(done, AS_OF);
    expect(p.progress).toBe(1);
    expect(p.monthsRemaining).toBe(0);
  });

  it('brings the ETA sooner with an extra contribution', () => {
    const base = projectGoal(goal, AS_OF);
    const boosted = projectWithExtra(goal, 200, AS_OF);
    expect(daysSooner(base, boosted)).toBeGreaterThan(0);
    expect(boosted.monthsRemaining!).toBeLessThan(base.monthsRemaining!);
  });
});
