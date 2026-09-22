/**
 * Subscription math (§24). The monthly → annual reframing is the point: a small
 * monthly charge is a meaningful yearly number.
 */
import { money } from './money';
import type { Subscription } from '@/types/domain';
import type { CurrencyCode, Money } from '@/types/money';

/** Normalize any subscription's charge to a monthly amount in minor units. */
export function monthlyMinor(sub: Subscription): number {
  switch (sub.frequency) {
    case 'weekly':
      return Math.round(sub.amount.minor * 4.333);
    case 'biweekly':
      return sub.amount.minor * 2;
    case 'yearly':
      return Math.round(sub.amount.minor / 12);
    case 'monthly':
    default:
      return sub.amount.minor;
  }
}

export function subscriptionTotals(
  subs: Subscription[],
  currency: CurrencyCode = 'PEN',
): { monthly: Money; yearly: Money } {
  const monthly = subs.reduce((acc, s) => acc + monthlyMinor(s), 0);
  return { monthly: money(monthly, currency), yearly: money(monthly * 12, currency) };
}
