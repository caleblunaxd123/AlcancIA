/**
 * Builds the initial FinancialSnapshot from the user's own onboarding answers,
 * so a first-time user immediately sees THEIR money — not demo data (§26).
 */
import { fromMajor } from './money';
import type { FinancialSnapshot, Income, RecurringTransaction, Goal } from '@/types/domain';
import type { OnboardingAnswers } from '@/types/onboarding';
import { nextDayOfMonth, toISODate } from '@/utils/date';

function nextPayDateISO(payDay: number, from: Date = new Date()): string {
  const safeDay = Math.min(28, Math.max(1, Math.round(payDay)));
  return toISODate(nextDayOfMonth(safeDay, from));
}

export function buildSnapshotFromOnboarding(answers: OnboardingAnswers): FinancialSnapshot {
  const income: Income[] = answers.monthlyIncome > 0
    ? [
        {
          id: 'inc-main',
          amount: fromMajor(answers.monthlyIncome),
          description: 'Ingreso principal',
          frequency: 'monthly',
          nextDate: nextPayDateISO(answers.payDay),
        },
      ]
    : [];

  const recurring: RecurringTransaction[] = answers.obligations.map((o) => ({
    id: `rec-${o.id}`,
    kind: 'expense',
    amount: fromMajor(o.amount),
    category: o.category,
    description: o.label,
    frequency: 'monthly',
    dayOfMonth: o.dayOfMonth,
    essential: true,
  }));

  const goals: Goal[] = answers.goal
    ? [
        {
          id: 'goal-1',
          kind: answers.goal.kind,
          name: answers.goal.name,
          target: fromMajor(answers.goal.target),
          saved: fromMajor(0),
          monthlyContribution: fromMajor(answers.goal.monthlyContribution),
          priority: 'high',
          targetDate: undefined,
        },
      ]
    : [];

  return {
    currentBalance: fromMajor(answers.currentBalance),
    // A small default safety buffer so safe-to-spend is conservative from day one.
    safetyBuffer: fromMajor(answers.monthlyIncome > 0 ? Math.min(300, answers.monthlyIncome * 0.05) : 0),
    income,
    recurring,
    transactions: [],
    goals,
    debts: [],
    subscriptions: [],
  };
}

/** An empty snapshot for a user who wants to start from scratch. */
export function emptySnapshot(): FinancialSnapshot {
  return {
    currentBalance: fromMajor(0),
    safetyBuffer: fromMajor(0),
    income: [],
    recurring: [],
    transactions: [],
    goals: [],
    debts: [],
    subscriptions: [],
  };
}

/** Suggested obligations shown as toggles during onboarding. */
export const SUGGESTED_OBLIGATIONS: {
  id: string;
  label: string;
  category: import('@/types/domain').CategoryId;
  dayOfMonth: number;
  defaultAmount: number;
  icon: string;
}[] = [
  { id: 'rent', label: 'Alquiler', category: 'housing', dayOfMonth: 5, defaultAmount: 1000, icon: 'house' },
  { id: 'internet', label: 'Internet', category: 'services', dayOfMonth: 8, defaultAmount: 100, icon: 'wifi' },
  { id: 'power', label: 'Luz y agua', category: 'services', dayOfMonth: 12, defaultAmount: 180, icon: 'plug-zap' },
  { id: 'phone', label: 'Celular', category: 'services', dayOfMonth: 10, defaultAmount: 50, icon: 'smartphone' },
  { id: 'transport', label: 'Transporte', category: 'transport', dayOfMonth: 1, defaultAmount: 200, icon: 'bus' },
];
