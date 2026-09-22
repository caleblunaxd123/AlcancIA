/**
 * Pure money helpers operating on integer minor units. No floats, no side
 * effects — safe to unit test in isolation.
 */
import { CURRENCY_META, type CurrencyCode, type Money } from '@/types/money';

export function money(minor: number, currency: CurrencyCode = 'PEN'): Money {
  return { minor: Math.round(minor), currency };
}

/** Build Money from a major-unit value (e.g. 742.5 -> 74250 minor). */
export function fromMajor(major: number, currency: CurrencyCode = 'PEN'): Money {
  const { decimals } = CURRENCY_META[currency];
  return { minor: Math.round(major * 10 ** decimals), currency };
}

export function toMajor(m: Money): number {
  const { decimals } = CURRENCY_META[m.currency];
  return m.minor / 10 ** decimals;
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { minor: a.minor + b.minor, currency: a.currency };
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { minor: a.minor - b.minor, currency: a.currency };
}

export function sum(items: Money[], currency: CurrencyCode = 'PEN'): Money {
  return items.reduce((acc, m) => add(acc, m), money(0, currency));
}

export function scale(m: Money, factor: number): Money {
  return { minor: Math.round(m.minor * factor), currency: m.currency };
}

export function isNegative(m: Money): boolean {
  return m.minor < 0;
}

export function clampToZero(m: Money): Money {
  return { minor: Math.max(0, m.minor), currency: m.currency };
}

export function compare(a: Money, b: Money): number {
  assertSameCurrency(a, b);
  return a.minor - b.minor;
}

/**
 * Format money for display. `hideDecimalsWhenRound` keeps large round figures
 * clean (S/ 20,000 rather than S/ 20,000.00) while preserving céntimos when
 * they matter (S/ 742.50).
 */
export function formatMoney(
  m: Money,
  opts: { withSymbol?: boolean; hideDecimalsWhenRound?: boolean; signed?: boolean } = {},
): string {
  const { withSymbol = true, hideDecimalsWhenRound = false, signed = false } = opts;
  const meta = CURRENCY_META[m.currency];
  const major = Math.abs(m.minor) / 10 ** meta.decimals;
  const isRound = Math.abs(m.minor) % 10 ** meta.decimals === 0;
  const fractionDigits = hideDecimalsWhenRound && isRound ? 0 : meta.decimals;

  const numberStr = new Intl.NumberFormat(meta.locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(major);

  const sign = m.minor < 0 ? '-' : signed ? '+' : '';
  const symbol = withSymbol ? `${meta.symbol} ` : '';
  return `${sign}${symbol}${numberStr}`;
}

/** Split a money display into parts so the UI can style symbol / integer / decimals. */
export function moneyParts(m: Money): {
  sign: string;
  symbol: string;
  integer: string;
  decimals: string;
} {
  const meta = CURRENCY_META[m.currency];
  const abs = Math.abs(m.minor);
  const integerPart = Math.floor(abs / 10 ** meta.decimals);
  const decimalPart = abs % 10 ** meta.decimals;
  return {
    sign: m.minor < 0 ? '-' : '',
    symbol: meta.symbol,
    integer: new Intl.NumberFormat(meta.locale).format(integerPart),
    decimals: decimalPart.toString().padStart(meta.decimals, '0'),
  };
}
