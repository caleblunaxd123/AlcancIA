/**
 * Debt payoff math (§23). Deterministic amortization — never AI. Given a balance,
 * annual rate and a monthly payment, compute how long it takes and how much
 * interest it costs, plus a comparison scenario for paying a bit more.
 */
import { money } from './money';
import type { Debt } from '@/types/domain';
import type { CurrencyCode, Money } from '@/types/money';

export type PayoffResult = {
  /** Months to clear the debt, or null if the payment never covers interest. */
  months: number | null;
  totalInterest: Money;
  totalPaid: Money;
};

const MAX_MONTHS = 1200; // 100 years — guards against non-amortizing payments.

export function simulatePayoff(
  balanceMinor: number,
  annualRate: number,
  monthlyPaymentMinor: number,
  currency: CurrencyCode = 'PEN',
): PayoffResult {
  if (balanceMinor <= 0) {
    return { months: 0, totalInterest: money(0, currency), totalPaid: money(0, currency) };
  }
  if (monthlyPaymentMinor <= 0) {
    return { months: null, totalInterest: money(0, currency), totalPaid: money(0, currency) };
  }

  const monthlyRate = annualRate / 12;
  let balance = balanceMinor;
  let totalInterest = 0;
  let totalPaid = 0;
  let months = 0;

  while (balance > 0 && months < MAX_MONTHS) {
    const interest = Math.round(balance * monthlyRate);
    // If the payment can't even cover interest, the debt never amortizes.
    if (monthlyPaymentMinor <= interest && monthlyRate > 0) {
      return { months: null, totalInterest: money(totalInterest, currency), totalPaid: money(totalPaid, currency) };
    }
    const payment = Math.min(monthlyPaymentMinor, balance + interest);
    totalInterest += interest;
    totalPaid += payment;
    balance = balance + interest - payment;
    months += 1;
  }

  return {
    months: balance <= 0 ? months : null,
    totalInterest: money(totalInterest, currency),
    totalPaid: money(totalPaid, currency),
  };
}

export function payoffForDebt(debt: Debt, monthlyPaymentMinor?: number): PayoffResult {
  return simulatePayoff(
    debt.balance.minor,
    debt.annualRate,
    monthlyPaymentMinor ?? debt.minimumPayment.minor,
    debt.balance.currency,
  );
}

/** Interest saved by paying `extraMinor` more each month. */
export function interestSavedWithExtra(debt: Debt, extraMinor: number): {
  base: PayoffResult;
  boosted: PayoffResult;
  monthsSaved: number;
  interestSaved: Money;
} {
  const base = payoffForDebt(debt);
  const boosted = payoffForDebt(debt, debt.minimumPayment.minor + extraMinor);
  const monthsSaved = base.months != null && boosted.months != null ? base.months - boosted.months : 0;
  const interestSaved = money(
    Math.max(0, base.totalInterest.minor - boosted.totalInterest.minor),
    debt.balance.currency,
  );
  return { base, boosted, monthsSaved, interestSaved };
}
