/**
 * Safe-to-Spend engine (§38/§39/§85).
 *
 * Deterministic. Given a financial snapshot and a reference date, it computes
 * how much the user can spend before their next income WITHOUT touching money
 * already reserved for obligations, essentials, savings, and a safety buffer.
 *
 * It returns not just a number but the ordered breakdown of every factor used,
 * so the UI can always answer "¿Cómo lo calculamos?".
 */
import { add, clampToZero, money, scale, subtract, sum } from './money';
import { nextOccurrence, occurrencesBetween, recurrenceAnchor } from './recurrence';
import { CATEGORIES } from '@/constants/categories';
import type { CurrencyCode, Money } from '@/types/money';
import type { FinancialSnapshot } from '@/types/domain';
import { addDays, daysBetween, nextDayOfMonth, parseISO } from '@/utils/date';

export type SafeToSpendLine = {
  key: string;
  label: string;
  amount: Money;
  /** 'add' increases available money, 'subtract' reserves it. */
  direction: 'add' | 'subtract';
  certainty: 'real' | 'scheduled' | 'estimated';
};

export type SafeToSpendResult = {
  amount: Money;
  /** Whether the result was clamped to zero for display. */
  clamped: boolean;
  currency: CurrencyCode;
  /** Days until the next expected income. */
  daysUntilIncome: number;
  nextIncomeDate: string | null;
  breakdown: SafeToSpendLine[];
};

const DEFAULT_ESSENTIAL_MONTHLY_ESTIMATE = 0;

/**
 * Estimate remaining variable-essential spend (food, transport) for the period.
 * Uses the average of the snapshot's real transactions in those categories,
 * projected across the remaining days of the period.
 */
function estimateVariableEssentials(
  snapshot: FinancialSnapshot,
  periodDays: number,
  currency: CurrencyCode,
  asOf: Date,
): Money {
  const variableEssentialCats = Object.values(CATEGORIES).filter(
    (c) => c.essential && c.id !== 'housing' && c.id !== 'services' && c.id !== 'debt',
  );
  const catIds = new Set(variableEssentialCats.map((c) => c.id));

  const windowStart = addDays(asOf, -90);
  const realSpend = snapshot.transactions.filter((t) => {
    const date = parseISO(t.date);
    return t.kind === 'expense' && catIds.has(t.category) && t.certainty === 'real'
      && date >= windowStart && date <= asOf;
  });

  if (realSpend.length === 0) {
    return money(DEFAULT_ESSENTIAL_MONTHLY_ESTIMATE, currency);
  }

  // Rough daily rate from observed spend over its own span (min 14 days to
  // avoid over-projecting from a tiny sample).
  const dates = realSpend.map((t) => parseISO(t.date).getTime());
  const spanDays = Math.max(
    14,
    daysBetween(new Date(Math.min(...dates)), new Date(Math.max(...dates))) + 1,
  );
  const total = sum(
    realSpend.map((t) => t.amount),
    currency,
  );
  const dailyRate = total.minor / spanDays;
  return money(Math.round(dailyRate * periodDays), currency);
}

export function calculateSafeToSpend(
  snapshot: FinancialSnapshot,
  asOf: Date = new Date(),
): SafeToSpendResult {
  const currency = snapshot.currentBalance.currency;
  const breakdown: SafeToSpendLine[] = [];

  // 1. Determine period end = next expected income.
  const futureIncomes = snapshot.income
    .map((income) => ({ income, date: nextOccurrence({ frequency: income.frequency, anchorDate: income.nextDate }, asOf) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const nextIncome = futureIncomes[0] ?? null;
  const periodEnd = nextIncome ? nextIncome.date : addDays(asOf, 30);
  const daysUntilIncome = Math.max(1, daysBetween(asOf, periodEnd));

  // 2. Start from current balance.
  let available = snapshot.currentBalance;
  breakdown.push({
    key: 'balance',
    label: 'Saldo considerado',
    amount: snapshot.currentBalance,
    direction: 'add',
    certainty: 'real',
  });

  // 3. Subtract fixed obligations (recurring essentials) due before period end.
  const obligations = snapshot.recurring.filter(
    (r) => r.kind === 'expense' && r.essential,
  );
  for (const o of obligations) {
    const anchorDate = o.nextDate ?? recurrenceAnchor(o.dayOfMonth ?? 15, asOf);
    const occurrences = occurrencesBetween({ frequency: o.frequency, anchorDate }, asOf, periodEnd);
    occurrences.forEach((due, index) => {
      available = subtract(available, o.amount);
      breakdown.push({
        key: occurrences.length > 1 ? `obligation-${o.id}-${index}` : `obligation-${o.id}`,
        label: occurrences.length > 1 ? `${o.description} (${due.getDate()})` : o.description,
        amount: o.amount,
        direction: 'subtract',
        certainty: 'scheduled',
      });
    });
  }

  // 4. Subtract debt minimum payments due before period end.
  for (const d of snapshot.debts) {
    const due = nextDayOfMonth(d.dueDay, asOf);
    if (due.getTime() <= periodEnd.getTime()) {
      available = subtract(available, d.minimumPayment);
      breakdown.push({
        key: `debt-${d.id}`,
        label: `${d.name} (cuota)`,
        amount: d.minimumPayment,
        direction: 'subtract',
        certainty: 'scheduled',
      });
    }
  }

  // 5. Subtract subscriptions renewing before period end.
  const subsTotal = snapshot.subscriptions.reduce((acc, subscription) => {
    const anchorDate = subscription.nextRenewalDate ?? recurrenceAnchor(subscription.renewalDay, asOf);
    const count = occurrencesBetween({ frequency: subscription.frequency, anchorDate }, asOf, periodEnd).length;
    return add(acc, scale(subscription.amount, count));
  }, money(0, currency));
  if (subsTotal.minor > 0) {
    available = subtract(available, subsTotal);
    breakdown.push({
      key: 'subscriptions',
      label: 'Suscripciones del periodo',
      amount: subsTotal,
      direction: 'subtract',
      certainty: 'scheduled',
    });
  }

  // 6. Subtract estimated variable essentials for the remaining period.
  const essentials = estimateVariableEssentials(snapshot, daysUntilIncome, currency, asOf);
  if (essentials.minor > 0) {
    available = subtract(available, essentials);
    breakdown.push({
      key: 'essentials',
      label: 'Gastos esenciales estimados',
      amount: essentials,
      direction: 'subtract',
      certainty: 'estimated',
    });
  }

  // 7. Subtract committed savings prorated for the period.
  const monthlySavings = snapshot.goals.reduce(
    (acc, g) => add(acc, g.monthlyContribution),
    money(0, currency),
  );
  const proratedSavings = scale(monthlySavings, daysUntilIncome / 30);
  if (proratedSavings.minor > 0) {
    available = subtract(available, proratedSavings);
    breakdown.push({
      key: 'savings',
      label: 'Ahorro comprometido',
      amount: proratedSavings,
      direction: 'subtract',
      certainty: 'scheduled',
    });
  }

  // 8. Subtract safety buffer.
  if (snapshot.safetyBuffer.minor > 0) {
    available = subtract(available, snapshot.safetyBuffer);
    breakdown.push({
      key: 'buffer',
      label: 'Margen de seguridad',
      amount: snapshot.safetyBuffer,
      direction: 'subtract',
      certainty: 'scheduled',
    });
  }

  const clamped = available.minor < 0;
  return {
    amount: clampToZero(available),
    clamped,
    currency,
    daysUntilIncome,
    nextIncomeDate: nextIncome ? nextIncome.income.nextDate : null,
    breakdown,
  };
}
