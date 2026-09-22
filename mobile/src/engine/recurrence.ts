import type { Frequency } from '@/types/domain';
import { addDays, parseISO, toISODate } from '@/utils/date';

type RecurrenceInput = {
  frequency: Frequency;
  anchorDate: string;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function monthlyOccurrence(anchor: Date, monthOffset: number): Date {
  const rawMonth = anchor.getMonth() + monthOffset;
  const year = anchor.getFullYear() + Math.floor(rawMonth / 12);
  const month = ((rawMonth % 12) + 12) % 12;
  return new Date(year, month, Math.min(anchor.getDate(), daysInMonth(year, month)));
}

function yearlyOccurrence(anchor: Date, yearOffset: number): Date {
  const year = anchor.getFullYear() + yearOffset;
  return new Date(year, anchor.getMonth(), Math.min(anchor.getDate(), daysInMonth(year, anchor.getMonth())));
}

/** Generates every occurrence inside an inclusive local-date interval. */
export function occurrencesBetween(
  input: RecurrenceInput,
  from: Date,
  to: Date,
): Date[] {
  const anchor = startOfDay(parseISO(input.anchorDate));
  const start = startOfDay(from);
  const end = startOfDay(to);
  if (end < start) return [];

  const result: Date[] = [];
  const maxOccurrences = 400;

  if (input.frequency === 'weekly' || input.frequency === 'biweekly') {
    const step = input.frequency === 'weekly' ? 7 : 14;
    let occurrence = anchor;
    if (occurrence < start) {
      const elapsedDays = Math.floor((start.getTime() - occurrence.getTime()) / 86_400_000);
      occurrence = addDays(occurrence, Math.floor(elapsedDays / step) * step);
      while (occurrence < start) occurrence = addDays(occurrence, step);
    }
    while (occurrence <= end && result.length < maxOccurrences) {
      result.push(occurrence);
      occurrence = addDays(occurrence, step);
    }
    return result;
  }

  let offset = 0;
  let occurrence = input.frequency === 'monthly'
    ? monthlyOccurrence(anchor, offset)
    : yearlyOccurrence(anchor, offset);
  while (occurrence < start && offset < maxOccurrences) {
    offset += 1;
    occurrence = input.frequency === 'monthly'
      ? monthlyOccurrence(anchor, offset)
      : yearlyOccurrence(anchor, offset);
  }
  while (occurrence <= end && result.length < maxOccurrences) {
    result.push(occurrence);
    offset += 1;
    occurrence = input.frequency === 'monthly'
      ? monthlyOccurrence(anchor, offset)
      : yearlyOccurrence(anchor, offset);
  }
  return result;
}

export function nextOccurrence(input: RecurrenceInput, from: Date = new Date()): Date {
  const horizon = new Date(from.getFullYear() + 2, from.getMonth(), from.getDate());
  return occurrencesBetween(input, from, horizon)[0] ?? parseISO(input.anchorDate);
}

export function recurrenceAnchor(dayOfMonth: number, from: Date = new Date()): string {
  const year = from.getFullYear();
  const month = from.getMonth();
  const day = Math.min(Math.max(1, dayOfMonth), daysInMonth(year, month));
  let date = new Date(year, month, day);
  if (date < startOfDay(from)) {
    date = monthlyOccurrence(date, 1);
  }
  return toISODate(date);
}
