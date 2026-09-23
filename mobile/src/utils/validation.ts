import { parseISO } from './date';

const MONEY_INPUT = /^\d{1,9}(?:[.,]\d{0,2})?$/;

export function parseMoneyInput(raw: string): number | null {
  const value = raw.trim();
  if (!MONEY_INPUT.test(value)) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function isISODateInput(raw: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const parsed = parseISO(raw);
  const [year, month, day] = raw.split('-').map(Number);
  return parsed.getFullYear() === year && parsed.getMonth() === month! - 1 && parsed.getDate() === day;
}
