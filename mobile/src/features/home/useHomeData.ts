import { useMemo } from 'react';

import { deriveWeather } from '@/engine/weather';
import { generateInsights } from '@/engine/insights';
import { projectGoal } from '@/engine/goals';
import { useFinancialStore } from '@/store/financialStore';
import type { Money } from '@/types/money';
import { nextDayOfMonth, daysBetween, formatDayMonth } from '@/utils/date';

export type NextPayment = {
  label: string;
  amount: Money;
  whenLabel: string;
  icon: string;
} | null;

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function useHomeData() {
  const snapshot = useFinancialStore((s) => s.snapshot);

  return useMemo(() => {
    const weather = deriveWeather(snapshot);
    const insights = generateInsights(snapshot);

    // Overall health proxy for the Financial House: blend of safe-to-spend
    // positivity and emergency-fund coverage.
    const emergency = snapshot.goals.find((g) => g.kind === 'emergency');
    const savingsProgress = emergency ? projectGoal(emergency).progress : 0.4;
    const health = Math.max(
      0.2,
      Math.min(1, (weather.safeToSpend.clamped ? 0.3 : 0.6) + savingsProgress * 0.4),
    );

    // Next upcoming payment among debts, subscriptions, and recurring bills.
    const candidates = [
      ...snapshot.debts.map((d) => ({ label: d.name, amount: d.minimumPayment, day: d.dueDay, icon: 'credit-card' })),
      ...snapshot.subscriptions.map((s) => ({ label: s.name, amount: s.amount, day: s.renewalDay, icon: 'repeat' })),
      ...snapshot.recurring
        .filter((r) => r.kind === 'expense' && r.dayOfMonth)
        .map((r) => ({ label: r.description, amount: r.amount, day: r.dayOfMonth!, icon: 'receipt' })),
    ]
      .map((c) => ({ ...c, date: nextDayOfMonth(c.day) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const first = candidates[0];
    let nextPayment: NextPayment = null;
    if (first) {
      const days = daysBetween(new Date(), first.date);
      const whenLabel =
        days === 0
          ? 'hoy'
          : days === 1
            ? 'mañana'
            : days <= 6
              ? WEEKDAYS[first.date.getDay()] ?? formatDayMonth(first.date.toISOString())
              : `en ${days} días`;
      nextPayment = { label: first.label, amount: first.amount, whenLabel, icon: first.icon };
    }

    const topGoals = [...snapshot.goals]
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 } as const;
        return order[a.priority] - order[b.priority];
      })
      .slice(0, 2);

    return { snapshot, weather, insights, health, savingsProgress, nextPayment, topGoals };
  }, [snapshot]);
}
