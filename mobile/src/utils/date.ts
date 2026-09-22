/** Small, dependency-free date helpers. All work in local time on ISO strings. */

export function parseISO(iso: string): Date {
  // Date-only strings ("YYYY-MM-DD") are parsed as UTC by the JS engine, which
  // shifts the calendar day in negative-offset timezones (e.g. Peru, UTC-5).
  // A bill "on the 16th" means the 16th locally, so parse date-only as local.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(iso);
  if (dateOnly) {
    const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
    return new Date(y, m - 1, d);
  }
  return new Date(iso);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from);
  a.setHours(0, 0, 0, 0);
  const b = new Date(to);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function formatDayMonth(iso: string): string {
  const d = parseISO(iso);
  return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`;
}

export function formatMonthYear(iso: string): string {
  const d = parseISO(iso);
  const month = MONTHS_ES[d.getMonth()] ?? '';
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${d.getFullYear()}`;
}

/** Next occurrence of `day` of month on or after `from`. */
export function nextDayOfMonth(day: number, from: Date = new Date()): Date {
  const candidate = new Date(from.getFullYear(), from.getMonth(), day);
  if (candidate.getTime() < new Date(from).setHours(0, 0, 0, 0)) {
    return new Date(from.getFullYear(), from.getMonth() + 1, day);
  }
  return candidate;
}
