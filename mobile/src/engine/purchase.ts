/**
 * "¿Puedo comprarlo?" simulator (§7/§31). Deterministic. Informs, never decides
 * for the user — the verdict describes compatibility with their plans, and the
 * copy deliberately avoids "buy" / "don't buy".
 */
import { calculateSafeToSpend } from './safeToSpend';
import { projectGoal } from './goals';
import { clampToZero, money, subtract } from './money';
import type { FinancialSnapshot, Goal } from '@/types/domain';
import type { Money } from '@/types/money';

export type PurchaseVerdict = 'compatible' | 'tight' | 'compromises';

export type PurchaseSimulation = {
  verdict: PurchaseVerdict;
  before: Money;
  after: Money;
  cost: Money;
  /** Whether the purchase would push safe-to-spend below zero. */
  wouldExceed: boolean;
  obligationsCovered: boolean;
  /** Impact on the highest-priority active goal, if any. */
  goalImpact: {
    goal: Goal;
    daysDelayed: number;
  } | null;
  headline: string;
};

const VERDICT_COPY: Record<PurchaseVerdict, string> = {
  compatible: 'Compatible con tus planes',
  tight: 'Posible, pero reduce tu margen',
  compromises: 'Comprometería obligaciones registradas',
};

function pickPrimaryGoal(goals: Goal[]): Goal | null {
  const active = goals.filter((g) => g.saved.minor < g.target.minor);
  if (active.length === 0) return null;
  const order = { high: 0, medium: 1, low: 2 } as const;
  return [...active].sort((a, b) => order[a.priority] - order[b.priority])[0] ?? null;
}

export function simulatePurchase(
  snapshot: FinancialSnapshot,
  costMinor: number,
  asOf: Date = new Date(),
): PurchaseSimulation {
  const currency = snapshot.currentBalance.currency;
  const cost = money(costMinor, currency);
  const sts = calculateSafeToSpend(snapshot, asOf);

  const before = sts.amount;
  const rawAfter = subtract(before, cost);
  const after = clampToZero(rawAfter);
  const wouldExceed = rawAfter.minor < 0;

  // Model the purchase as pulling from this period's savings contribution,
  // which delays the primary goal proportionally.
  const primaryGoal = pickPrimaryGoal(snapshot.goals);
  let goalImpact: PurchaseSimulation['goalImpact'] = null;
  if (primaryGoal && primaryGoal.monthlyContribution.minor > 0) {
    // How many months of contribution this purchase consumes.
    const monthsConsumed = cost.minor / primaryGoal.monthlyContribution.minor;
    const base = projectGoal(primaryGoal, asOf);
    // Simulate a temporary reduction: contribute nothing extra, just delay.
    const delayedDays = Math.round(monthsConsumed * 30.44);
    if (base.etaDate) {
      goalImpact = { goal: primaryGoal, daysDelayed: delayedDays };
    }
  }

  const obligationsCovered = !wouldExceed;

  let verdict: PurchaseVerdict;
  if (wouldExceed) verdict = 'compromises';
  else if (rawAfter.minor < before.minor * 0.35) verdict = 'tight';
  else verdict = 'compatible';

  return {
    verdict,
    before,
    after,
    cost,
    wouldExceed,
    obligationsCovered,
    goalImpact,
    headline: VERDICT_COPY[verdict],
  };
}
