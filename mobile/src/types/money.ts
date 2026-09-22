/**
 * Money is represented as an integer number of minor units (céntimos for PEN,
 * cents for USD). NEVER use floats for money (§37). All engine math operates on
 * these integers; formatting to a decimal string happens only at the edge.
 */

export type CurrencyCode = 'PEN' | 'USD';

export type Money = {
  /** Integer minor units. e.g. S/ 742.50 -> 74250 */
  minor: number;
  currency: CurrencyCode;
};

export const CURRENCY_META: Record<
  CurrencyCode,
  { symbol: string; decimals: number; locale: string }
> = {
  PEN: { symbol: 'S/', decimals: 2, locale: 'es-PE' },
  USD: { symbol: '$', decimals: 2, locale: 'en-US' },
};
