import { deriveWeather, type WeatherResult } from '@/engine/weather';
import { generateInsights, type Insight } from '@/engine/insights';
import { projectGoal } from '@/engine/goals';
import type { FinancialSnapshot, Goal } from '@/types/domain';
import type { Money } from '@/types/money';
import { nextDayOfMonth, daysBetween, formatDayMonth } from '@/utils/date';
import { nextOccurrence, recurrenceAnchor } from '@/engine/recurrence';

export type NextPayment = {
  label: string;
  amount: Money;
  whenLabel: string;
  icon: string;
} | null;

export type HomeData = {
  weather: WeatherResult;
  insights: Insight[];
  health: number;
  savingsProgress: number;
  nextPayment: NextPayment;
  /** Up to three soonest payments, for the "Próximos pagos" list. */
  upcoming: NonNullable<NextPayment>[];
  topGoals: Goal[];
};

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function computeHomeData(snapshot: FinancialSnapshot, now: Date = new Date()): HomeData {
  const weather = deriveWeather(snapshot, now);
  const insights = generateInsights(snapshot);

  // Overall health proxy for the Financial House: blend of safe-to-spend
  // positivity and savings progress. Progress comes from the emergency goal
  // when it exists; otherwise it averages the user's real goals (§27: no
  // hardcoded progress).
  const emergency = snapshot.goals.find((g) => g.kind === 'emergency');
  const savingsProgress = emergency
    ? projectGoal(emergency).progress
    : snapshot.goals.length > 0
      ? snapshot.goals.reduce((acc, g) => acc + projectGoal(g).progress, 0) / snapshot.goals.length
      : 0;
  const health = Math.max(
    0.2,
    Math.min(1, (weather.safeToSpend.clamped ? 0.3 : 0.6) + savingsProgress * 0.4),
  );

  // Next upcoming payment among debts, subscriptions, and recurring bills.
  const candidates = [
    ...snapshot.debts.map((d) => ({ label: d.name, amount: d.minimumPayment, date: nextDayOfMonth(d.dueDay, now), icon: 'credit-card' })),
    ...snapshot.subscriptions.map((s) => ({
      label: s.name,
      amount: s.amount,
      date: nextOccurrence({ frequency: s.frequency, anchorDate: s.nextRenewalDate ?? recurrenceAnchor(s.renewalDay, now) }, now),
      icon: 'repeat',
    })),
    ...snapshot.recurring
      .filter((r) => r.kind === 'expense' && r.dayOfMonth)
      .map((r) => ({
        label: r.description,
        amount: r.amount,
        date: nextOccurrence({ frequency: r.frequency, anchorDate: r.nextDate ?? recurrenceAnchor(r.dayOfMonth!, now) }, now),
        icon: 'receipt',
      })),
  ]
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const toPayment = (c: (typeof candidates)[number]): NonNullable<NextPayment> => {
    // daysBetween normalizes its `to` argument in place; pass a copy.
    const days = daysBetween(now, new Date(c.date));
    const whenLabel =
      days === 0
        ? 'hoy'
        : days === 1
          ? 'mañana'
          : days <= 6
            ? `el ${WEEKDAYS[c.date.getDay()] ?? formatDayMonth(c.date.toISOString())}`
            : `en ${days} días`;
    return { label: c.label, amount: c.amount, whenLabel, icon: c.icon };
  };

  const upcoming = candidates.slice(0, 3).map(toPayment);
  const nextPayment: NextPayment = upcoming[0] ?? null;

  const topGoals = [...snapshot.goals]
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 } as const;
      return order[a.priority] - order[b.priority];
    })
    .slice(0, 6);

  return { weather, insights, health, savingsProgress, nextPayment, upcoming, topGoals };
}
