/**
 * Monthly allocation of income (§: "división del dinero"). Deterministic, in
 * integer minor units. Splits the normalized monthly income into four
 * user-facing buckets:
 *
 *   obligations = fixed essential bills + debt minimums + subscriptions
 *   savings     = committed monthly goal contributions
 *   spending    = real expenses recorded in the current month (excluding
 *                 system operations like goal contributions and debt payments,
 *                 which are already represented by savings/obligations)
 *   free        = whatever is left (clamped to zero; `overspent` flags the
 *                 negative case so the UI can say so honestly, without shame)
 *
 * `share` values are UI ratios (0..1), not money.
 */
import { money } from './money';
import { monthlyMinor as monthlySubscriptionMinor } from './subscriptions';
import { parseISO } from '@/utils/date';
import type { FinancialSnapshot, Income, RecurringTransaction } from '@/types/domain';
import type { CurrencyCode, Money } from '@/types/money';

export type AllocationSliceId = 'obligations' | 'savings' | 'spending' | 'free';

export type AllocationSlice = {
  id: AllocationSliceId;
  amount: Money;
  /** Portion of monthly income, 0..1. Zero when income is unknown. */
  share: number;
};

export type AllocationLine = {
  label: string;
  amount: Money;
};

export type AllocationResult = {
  /** Normalized monthly income across all sources. */
  income: Money;
  /** No income configured: the UI should not pretend to divide anything. */
  incomeUnknown: boolean;
  slices: AllocationSlice[];
  /** Itemized obligations (bills, debt minimums, subscriptions) for the explainer. */
  obligationLines: AllocationLine[];
  /** Itemized savings commitments for the explainer. */
  savingsLines: AllocationLine[];
  /** spending + obligations + savings exceeded income (free clamped to 0). */
  overspent: boolean;
  currency: CurrencyCode;
};

/** Normalize any income source to a monthly amount in minor units. */
export function monthlyIncomeMinor(income: Income): number {
  switch (income.frequency) {
    case 'weekly':
      return Math.round(income.amount.minor * 4.333);
    case 'biweekly':
      return income.amount.minor * 2;
    case 'yearly':
      return Math.round(income.amount.minor / 12);
    case 'monthly':
    default:
      return income.amount.minor;
  }
}

/** Normalize a recurring transaction to a monthly amount in minor units. */
export function monthlyRecurringMinor(recurring: RecurringTransaction): number {
  switch (recurring.frequency) {
    case 'weekly':
      return Math.round(recurring.amount.minor * 4.333);
    case 'biweekly':
      return recurring.amount.minor * 2;
    case 'yearly':
      return Math.round(recurring.amount.minor / 12);
    case 'monthly':
    default:
      return recurring.amount.minor;
  }
}

export function computeAllocation(snapshot: FinancialSnapshot, now: Date = new Date()): AllocationResult {
  const currency = snapshot.currentBalance.currency;

  const incomeMinor = snapshot.income.reduce((acc, i) => acc + monthlyIncomeMinor(i), 0);

  const obligationLines: AllocationLine[] = [
    ...snapshot.recurring
      .filter((r) => r.kind === 'expense' && r.essential)
      .map((r) => ({ label: r.description, amount: money(monthlyRecurringMinor(r), currency) })),
    ...snapshot.debts.map((d) => ({ label: `${d.name} (cuota)`, amount: d.minimumPayment })),
    ...snapshot.subscriptions.map((s) => ({ label: s.name, amount: money(monthlySubscriptionMinor(s), currency) })),
  ];

  const savingsLines: AllocationLine[] = snapshot.goals
    .filter((g) => g.monthlyContribution.minor > 0)
    .map((g) => ({ label: g.name, amount: g.monthlyContribution }));

  const obligationsMinor = obligationLines.reduce((acc, l) => acc + l.amount.minor, 0);
  const savingsMinor = savingsLines.reduce((acc, l) => acc + l.amount.minor, 0);

  const spendingMinor = snapshot.transactions
    .filter((t) => {
      if (t.kind !== 'expense' || t.operation) return false;
      const date = parseISO(t.date);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    })
    .reduce((acc, t) => acc + t.amount.minor, 0);

  if (incomeMinor <= 0) {
    const zero = money(0, currency);
    return {
      income: zero,
      incomeUnknown: true,
      overspent: false,
      currency,
      obligationLines,
      savingsLines,
      slices: (['obligations', 'savings', 'spending', 'free'] as const).map((id) => ({ id, amount: zero, share: 0 })),
    };
  }

  const committed = obligationsMinor + savingsMinor + spendingMinor;
  const freeMinor = incomeMinor - committed;
  const overspent = freeMinor < 0;

  const amounts: Record<AllocationSliceId, number> = {
    obligations: obligationsMinor,
    savings: savingsMinor,
    spending: spendingMinor,
    free: Math.max(0, freeMinor),
  };

  return {
    income: money(incomeMinor, currency),
    incomeUnknown: false,
    overspent,
    currency,
    obligationLines,
    savingsLines,
    slices: (['obligations', 'savings', 'spending', 'free'] as const).map((id) => ({
      id,
      amount: money(amounts[id], currency),
      share: Math.min(1, amounts[id] / incomeMinor),
    })),
  };
}
