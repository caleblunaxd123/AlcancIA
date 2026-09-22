import { interestSavedWithExtra, payoffForDebt, simulatePayoff } from '@/engine/debts';
import type { Debt } from '@/types/domain';
import { fromMajor } from '@/engine/money';

function debt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: 'd1',
    name: 'Tarjeta',
    kind: 'card',
    balance: fromMajor(2400),
    minimumPayment: fromMajor(300),
    annualRate: 0.55,
    dueDay: 15,
    ...overrides,
  };
}

describe('simulatePayoff', () => {
  it('returns zero months for a zero balance', () => {
    const r = simulatePayoff(0, 0.55, 30000);
    expect(r.months).toBe(0);
    expect(r.totalInterest.minor).toBe(0);
    expect(r.totalPaid.minor).toBe(0);
  });

  it('returns null months when there is no payment', () => {
    expect(simulatePayoff(100000, 0.55, 0).months).toBeNull();
  });

  it('returns null months when the payment never covers interest', () => {
    // 1000.00 at 55% annual accrues ~45.83/minor-month; a 10.00 payment never amortizes.
    const r = simulatePayoff(100000, 0.55, 1000);
    expect(r.months).toBeNull();
  });

  it('amortizes the demo card in 11 months at the minimum payment', () => {
    const r = simulatePayoff(240000, 0.55, 30000);
    expect(r.months).toBe(11);
    expect(r.totalInterest.minor).toBe(65873);
    expect(r.totalPaid.minor).toBe(240000 + 65873);
  });

  it('caps at MAX_MONTHS instead of looping forever (0% rate, tiny payment)', () => {
    const r = simulatePayoff(100000, 0, 1);
    expect(r.months).toBeNull();
  });

  it('threads the currency through', () => {
    const r = simulatePayoff(100000, 0.2, 50000, 'USD');
    expect(r.totalInterest.currency).toBe('USD');
    expect(r.totalPaid.currency).toBe('USD');
  });
});

describe('payoffForDebt', () => {
  it('uses the debt minimum payment and currency by default', () => {
    const r = payoffForDebt(debt({ balance: fromMajor(2400) }));
    expect(r.months).toBe(11);
    expect(r.totalInterest.currency).toBe('PEN');
  });

  it('accepts an explicit monthly payment', () => {
    const r = payoffForDebt(debt(), 60000);
    expect(r.months).toBeLessThan(11);
  });
});

describe('interestSavedWithExtra', () => {
  it('reports zero savings for zero extra', () => {
    const s = interestSavedWithExtra(debt(), 0);
    expect(s.monthsSaved).toBe(0);
    expect(s.interestSaved.minor).toBe(0);
  });

  it('reports fewer months and less interest when paying extra', () => {
    const s = interestSavedWithExtra(debt(), 30000);
    expect(s.monthsSaved).toBeGreaterThan(0);
    expect(s.interestSaved.minor).toBeGreaterThan(0);
    expect(s.boosted.months).toBe(s.base.months! - s.monthsSaved);
  });
});
