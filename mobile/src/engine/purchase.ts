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
  /** How much money is missing when it exceeds (0 otherwise). */
  shortfall: Money;
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
  compromises: 'No te alcanza sin tocar tus pagos',
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
  if (!Number.isSafeInteger(costMinor) || costMinor <= 0) {
    throw new RangeError('Purchase cost must be a positive integer amount');
  }
  const currency = snapshot.currentBalance.currency;
  const cost = money(costMinor, currency);
  const sts = calculateSafeToSpend(snapshot, asOf);

  const before = sts.amount;
  const rawAfter = subtract(before, cost);
  const after = clampToZero(rawAfter);
  const wouldExceed = rawAfter.minor < 0;

  // Only the portion beyond Safe-to-Spend competes with money reserved for the
  // primary goal. A purchase inside the margin must not claim to delay it.
  const primaryGoal = pickPrimaryGoal(snapshot.goals);
  let goalImpact: PurchaseSimulation['goalImpact'] = null;
  const savingsShortfall = Math.max(0, cost.minor - before.minor);
  if (savingsShortfall > 0 && primaryGoal && primaryGoal.monthlyContribution.minor > 0) {
    const monthsConsumed = savingsShortfall / primaryGoal.monthlyContribution.minor;
    const base = projectGoal(primaryGoal, asOf);
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
    shortfall: money(Math.max(0, -rawAfter.minor), currency),
    obligationsCovered,
    goalImpact,
    headline: VERDICT_COPY[verdict],
  };
}
