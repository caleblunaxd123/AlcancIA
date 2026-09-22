/**
 * Financial calendar (§25). Collects the money events for a given month from the
 * snapshot: income, recurring bills, debt payments, subscription renewals.
 */
import type { FinancialSnapshot } from '@/types/domain';
import type { Money } from '@/types/money';
import { parseISO } from '@/utils/date';

export type CalendarEventKind = 'income' | 'bill' | 'debt' | 'subscription';

export type CalendarEvent = {
  day: number;
  label: string;
  amount: Money;
  kind: CalendarEventKind;
};

function clampDay(day: number, year: number, month: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Math.min(Math.max(1, day), daysInMonth);
}

/** All events for the given year/month (month is 0-indexed). */
export function eventsForMonth(
  snapshot: FinancialSnapshot,
  year: number,
  month: number,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const inc of snapshot.income) {
    const d = parseISO(inc.nextDate);
    // Income carries a concrete date, so it only belongs to its own month.
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    events.push({ day: d.getDate(), label: inc.description, amount: inc.amount, kind: 'income' });
  }
  for (const r of snapshot.recurring) {
    if (r.kind !== 'expense' || !r.dayOfMonth) continue;
    events.push({ day: clampDay(r.dayOfMonth, year, month), label: r.description, amount: r.amount, kind: 'bill' });
  }
  for (const d of snapshot.debts) {
    events.push({ day: clampDay(d.dueDay, year, month), label: `${d.name} (cuota)`, amount: d.minimumPayment, kind: 'debt' });
  }
  for (const s of snapshot.subscriptions) {
    events.push({ day: clampDay(s.renewalDay, year, month), label: s.name, amount: s.amount, kind: 'subscription' });
  }

  return events.sort((a, b) => a.day - b.day);
}

export function eventsByDay(events: CalendarEvent[]): Map<number, CalendarEvent[]> {
  const map = new Map<number, CalendarEvent[]>();
  for (const e of events) {
    const list = map.get(e.day) ?? [];
    list.push(e);
    map.set(e.day, list);
  }
  return map;
}
