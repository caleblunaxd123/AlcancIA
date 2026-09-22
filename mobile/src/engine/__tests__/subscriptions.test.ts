import { monthlyMinor, subscriptionTotals } from '@/engine/subscriptions';
import { fromMajor } from '@/engine/money';
import type { Subscription } from '@/types/domain';

function sub(frequency: Subscription['frequency'], major: number): Subscription {
  return {
    id: `s-${frequency}`,
    name: frequency,
    amount: fromMajor(major),
    frequency,
    category: 'subscriptions',
    renewalDay: 5,
  };
}

describe('monthlyMinor', () => {
  it('passes monthly amounts through', () => {
    expect(monthlyMinor(sub('monthly', 44.9))).toBe(4490);
  });

  it('normalizes weekly charges by ~4.333 weeks', () => {
    expect(monthlyMinor(sub('weekly', 10))).toBe(4333);
  });

  it('doubles biweekly charges', () => {
    expect(monthlyMinor(sub('biweekly', 50))).toBe(10000);
  });

  it('divides yearly charges by 12', () => {
    expect(monthlyMinor(sub('yearly', 120))).toBe(1000);
  });
});

describe('subscriptionTotals', () => {
  it('sums normalized monthly amounts and projects the year', () => {
    const totals = subscriptionTotals([sub('monthly', 44.9), sub('yearly', 120)]);
    expect(totals.monthly.minor).toBe(4490 + 1000);
    expect(totals.yearly.minor).toBe((4490 + 1000) * 12);
  });

  it('returns zero for an empty list', () => {
    const totals = subscriptionTotals([]);
    expect(totals.monthly.minor).toBe(0);
    expect(totals.yearly.minor).toBe(0);
  });

  it('threads the currency through', () => {
    const totals = subscriptionTotals([sub('monthly', 10)], 'USD');
    expect(totals.monthly.currency).toBe('USD');
    expect(totals.yearly.currency).toBe('USD');
  });
});
