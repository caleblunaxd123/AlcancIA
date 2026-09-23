/**
 * Financial Weather (§4). Never alarmist. Translates the deterministic snapshot
 * into a calm, human weather state plus the reasons behind it.
 */
import { calculateSafeToSpend, type SafeToSpendResult } from './safeToSpend';
import type { FinancialSnapshot, WeatherState } from '@/types/domain';
import { nextDayOfMonth, daysBetween } from '@/utils/date';
import { nextOccurrence, recurrenceAnchor } from './recurrence';

export type WeatherReason = {
  tone: 'positive' | 'attention';
  text: string;
};

export type WeatherResult = {
  state: WeatherState;
  headline: string;
  reasons: WeatherReason[];
  safeToSpend: SafeToSpendResult;
};

const HEADLINES: Record<WeatherState, string> = {
  calm: 'Tu dinero está tranquilo hoy.',
  stable: 'Tu dinero está estable hoy.',
  tight: 'Tu semana está algo ajustada.',
  attention: 'Vale la pena mirar tu semana.',
  stormy: 'Tu semana pide un poco de cuidado.',
};

export function deriveWeather(
  snapshot: FinancialSnapshot,
  asOf: Date = new Date(),
): WeatherResult {
  const sts = calculateSafeToSpend(snapshot, asOf);
  const reasons: WeatherReason[] = [];

  const monthlyIncome = snapshot.income.reduce((acc, i) => {
    const perMonth =
      i.frequency === 'weekly'
        ? i.amount.minor * 4.33
        : i.frequency === 'biweekly'
          ? i.amount.minor * 2
          : i.frequency === 'yearly'
            ? i.amount.minor / 12
            : i.amount.minor;
    return acc + perMonth;
  }, 0);

  // Daily safe-to-spend headroom relative to the period.
  const dailyHeadroom = sts.amount.minor / sts.daysUntilIncome;
  const monthlyDaily = monthlyIncome / 30;
  const headroomRatio = monthlyDaily > 0 ? dailyHeadroom / monthlyDaily : 0;

  // Upcoming pressure: obligations due in the next 5 days.
  const soon = [
    ...snapshot.debts.map((d) => ({ label: `${d.name}`, date: nextDayOfMonth(d.dueDay, asOf) })),
    ...snapshot.subscriptions.map((s) => ({
      label: s.name,
      date: nextOccurrence({ frequency: s.frequency, anchorDate: s.nextRenewalDate ?? recurrenceAnchor(s.renewalDay, asOf) }, asOf),
    })),
  ].filter((x) => {
    const days = daysBetween(asOf, x.date);
    return days >= 0 && days <= 5;
  });

  // Positives.
  if (monthlyIncome > 0) {
    reasons.push({ tone: 'positive', text: 'Ingreso principal considerado' });
  }
  if (sts.amount.minor > 0) {
    reasons.push({ tone: 'positive', text: 'Obligaciones del periodo cubiertas' });
  }
  const goalsOnTrack = snapshot.goals.filter((g) => g.monthlyContribution.minor > 0);
  if (goalsOnTrack.length > 0) {
    reasons.push({ tone: 'positive', text: 'Plan de aportes configurado' });
  }

  // Attention (soft, specific, never shaming — §3).
  for (const item of soon.slice(0, 2)) {
    const days = daysBetween(asOf, item.date);
    reasons.push({
      tone: 'attention',
      text: `${item.label} vence en ${days === 0 ? 'hoy' : `${days} día${days === 1 ? '' : 's'}`}`,
    });
  }

  let state: WeatherState;
  if (sts.clamped) state = 'stormy';
  else if (headroomRatio >= 1.1) state = 'calm';
  else if (headroomRatio >= 0.6) state = 'stable';
  else if (headroomRatio >= 0.3) state = 'tight';
  else state = 'attention';

  // Nudge downward if lots of near-term pressure.
  if (soon.length >= 3 && state === 'calm') state = 'stable';

  return {
    state,
    headline: HEADLINES[state],
    reasons,
    safeToSpend: sts,
  };
}

export function weatherEmoji(state: WeatherState): string {
  switch (state) {
    case 'calm':
      return '☀️';
    case 'stable':
      return '🌤️';
    case 'tight':
      return '⛅';
    case 'attention':
      return '🌧️';
    case 'stormy':
      return '⛈️';
  }
}
