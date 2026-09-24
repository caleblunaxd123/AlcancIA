import { eventsByDay, eventsForMonth, monthGrid } from '@/engine/calendar';
import { fromMajor } from '@/engine/money';
import type { FinancialSnapshot } from '@/types/domain';

const snapshot: FinancialSnapshot = {
  currentBalance: fromMajor(0),
  safetyBuffer: fromMajor(0),
  income: [
    { id: 'i1', amount: fromMajor(3500), description: 'Sueldo', frequency: 'monthly', nextDate: '2026-09-30' },
  ],
  recurring: [
    { id: 'r1', kind: 'expense', amount: fromMajor(1200), category: 'housing', description: 'Alquiler', frequency: 'monthly', dayOfMonth: 5, essential: true },
    { id: 'r2', kind: 'expense', amount: fromMajor(100), category: 'services', description: 'Internet', frequency: 'monthly', dayOfMonth: 30, essential: true },
  ],
  transactions: [],
  goals: [],
  debts: [
    { id: 'd1', name: 'Tarjeta', kind: 'card', balance: fromMajor(2400), minimumPayment: fromMajor(300), annualRate: 0.55, dueDay: 31 },
  ],
  subscriptions: [
    { id: 's1', name: 'Netflix', amount: fromMajor(44.9), frequency: 'monthly', category: 'subscriptions', renewalDay: 15 },
  ],
};

describe('eventsForMonth', () => {
  it('projects recurring income into future months', () => {
    const september = eventsForMonth(snapshot, 2026, 8);
    expect(september.some((e) => e.kind === 'income' && e.day === 30)).toBe(true);
    const october = eventsForMonth(snapshot, 2026, 9);
    expect(october.some((e) => e.kind === 'income' && e.day === 30)).toBe(true);
  });

  it('repeats recurring bills every month', () => {
    for (const month of [0, 4, 8]) {
      const events = eventsForMonth(snapshot, 2026, month);
      expect(events.some((e) => e.kind === 'bill' && e.label === 'Alquiler')).toBe(true);
    }
  });

  it('clamps days that do not exist in the month', () => {
    // February 2026 has 28 days: the day-30 bill and day-31 debt land on the 28th.
    const february = eventsForMonth(snapshot, 2026, 1);
    expect(february.find((e) => e.label === 'Internet')?.day).toBe(28);
    expect(february.find((e) => e.kind === 'debt')?.day).toBe(28);
  });

  it('includes debt cuotas and subscription renewals', () => {
    const events = eventsForMonth(snapshot, 2026, 8);
    expect(events.some((e) => e.kind === 'debt' && e.label === 'Tarjeta (cuota)')).toBe(true);
    expect(events.some((e) => e.kind === 'subscription' && e.day === 15)).toBe(true);
  });

  it('sorts events by day', () => {
    const days = eventsForMonth(snapshot, 2026, 8).map((e) => e.day);
    expect([...days].sort((a, b) => a - b)).toEqual(days);
  });
});

describe('eventsByDay', () => {
  it('groups events sharing a day', () => {
    const february = eventsForMonth(snapshot, 2026, 1);
    const byDay = eventsByDay(february);
    expect(byDay.get(28)).toHaveLength(2); // clamped bill + clamped debt
    expect(byDay.get(5)).toHaveLength(1);
  });

  it('returns an empty map for an empty month', () => {
    expect(eventsByDay([]).size).toBe(0);
  });
});

describe('monthGrid', () => {
  it('starts weeks on Monday and pads the edges', () => {
    // September 2026 starts on a Tuesday and has 30 days.
    const weeks = monthGrid(2026, 8);
    expect(weeks[0]).toEqual([null, 1, 2, 3, 4, 5, 6]);
    expect(weeks[weeks.length - 1]).toEqual([28, 29, 30, null, null, null, null]);
    expect(weeks.flat().filter((d) => d !== null)).toHaveLength(30);
  });

  it('handles a month that starts on Sunday and leap Februaries', () => {
    expect(monthGrid(2026, 1)[0]).toEqual([null, null, null, null, null, null, 1]); // Feb 1 2026 = Sunday
    expect(monthGrid(2028, 1).flat().filter((d) => d !== null)).toHaveLength(29);
  });
});
