import { computeAllocation, monthlyIncomeMinor, monthlyRecurringMinor } from '@/engine/allocation';
import { fromMajor } from '@/engine/money';
import type { FinancialSnapshot, Transaction } from '@/types/domain';
import { toISODate } from '@/utils/date';

function baseSnapshot(): FinancialSnapshot {
  return {
    currentBalance: fromMajor(1000),
    safetyBuffer: fromMajor(0),
    income: [],
    recurring: [],
    transactions: [],
    goals: [],
    debts: [],
    subscriptions: [],
  };
}

const NOW = new Date('2026-01-15T12:00:00');
const inMonth = (day: number) => `2026-01-${String(day).padStart(2, '0')}`;

function expense(day: number, major: number, extra: Partial<Transaction> = {}): Transaction {
  return {
    id: `t-${day}-${major}`,
    kind: 'expense',
    amount: fromMajor(major),
    category: 'food',
    description: 'Gasto',
    date: inMonth(day),
    certainty: 'real',
    source: 'manual',
    ...extra,
  };
}

describe('monthly normalization', () => {
  it('normalizes income frequencies to a month', () => {
    const base = { id: 'i', amount: fromMajor(1000), description: 'x', nextDate: '2026-01-30' } as const;
    expect(monthlyIncomeMinor({ ...base, frequency: 'monthly' })).toBe(100000);
    expect(monthlyIncomeMinor({ ...base, frequency: 'weekly' })).toBe(433300);
    expect(monthlyIncomeMinor({ ...base, frequency: 'biweekly' })).toBe(200000);
    expect(monthlyIncomeMinor({ ...base, frequency: 'yearly' })).toBe(8333);
  });

  it('normalizes recurring frequencies to a month', () => {
    const base = { id: 'r', kind: 'expense', amount: fromMajor(100), category: 'housing', description: 'x', essential: true } as const;
    expect(monthlyRecurringMinor({ ...base, frequency: 'monthly' })).toBe(10000);
    expect(monthlyRecurringMinor({ ...base, frequency: 'weekly' })).toBe(43330);
    expect(monthlyRecurringMinor({ ...base, frequency: 'biweekly' })).toBe(20000);
    expect(monthlyRecurringMinor({ ...base, frequency: 'yearly' })).toBe(833);
  });
});

describe('computeAllocation', () => {
  it('splits a typical month into obligations, savings, spending and free', () => {
    const snap = baseSnapshot();
    snap.income = [{ id: 'inc', amount: fromMajor(3000), description: 'Sueldo', frequency: 'monthly', nextDate: '2026-01-30' }];
    snap.recurring = [
      { id: 'rent', kind: 'expense', amount: fromMajor(900), category: 'housing', description: 'Alquiler', frequency: 'monthly', dayOfMonth: 5, essential: true },
      { id: 'gym-fee', kind: 'expense', amount: fromMajor(50), category: 'entertainment', description: 'Gusto', frequency: 'monthly', dayOfMonth: 6, essential: false },
    ];
    snap.debts = [{ id: 'd', kind: 'card', name: 'Tarjeta', balance: fromMajor(2000), minimumPayment: fromMajor(150), annualRate: 0.4, dueDay: 20 }];
    snap.subscriptions = [{ id: 's', name: 'Netflix', amount: fromMajor(45), frequency: 'monthly', category: 'subscriptions', renewalDay: 10 }];
    snap.goals = [{ id: 'g', kind: 'emergency', name: 'Fondo', target: fromMajor(6000), saved: fromMajor(600), monthlyContribution: fromMajor(200), priority: 'high' }];
    snap.transactions = [expense(3, 100), expense(8, 50)];

    const result = computeAllocation(snap, NOW);
    expect(result.income.minor).toBe(300000);
    expect(result.incomeUnknown).toBe(false);
    expect(result.overspent).toBe(false);

    const byId = Object.fromEntries(result.slices.map((s) => [s.id, s.amount.minor]));
    // obligations: 900 rent + 150 debt + 45 netflix (non-essential recurring excluded)
    expect(byId.obligations).toBe(109500);
    expect(byId.savings).toBe(20000);
    expect(byId.spending).toBe(15000);
    // free: 300000 - 109500 - 20000 - 15000
    expect(byId.free).toBe(155500);
  });

  it('shares sum to 1 when the month balances', () => {
    const snap = baseSnapshot();
    snap.income = [{ id: 'inc', amount: fromMajor(1000), description: 'Sueldo', frequency: 'monthly', nextDate: '2026-01-30' }];
    snap.goals = [{ id: 'g', kind: 'travel', name: 'Viaje', target: fromMajor(3000), saved: fromMajor(0), monthlyContribution: fromMajor(250), priority: 'medium' }];
    snap.transactions = [expense(2, 250)];

    const result = computeAllocation(snap, NOW);
    const total = result.slices.reduce((acc, s) => acc + s.share, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it('flags overspending and clamps free to zero without shaming', () => {
    const snap = baseSnapshot();
    snap.income = [{ id: 'inc', amount: fromMajor(500), description: 'Sueldo', frequency: 'monthly', nextDate: '2026-01-30' }];
    snap.transactions = [expense(2, 600)];

    const result = computeAllocation(snap, NOW);
    expect(result.overspent).toBe(true);
    const free = result.slices.find((s) => s.id === 'free');
    expect(free?.amount.minor).toBe(0);
    // Spending share is capped at 1 so the bar never overflows.
    const spending = result.slices.find((s) => s.id === 'spending');
    expect(spending?.share).toBe(1);
  });

  it('excludes goal contributions and debt payments from spending (already counted)', () => {
    const snap = baseSnapshot();
    snap.income = [{ id: 'inc', amount: fromMajor(1000), description: 'Sueldo', frequency: 'monthly', nextDate: '2026-01-30' }];
    snap.transactions = [
      expense(2, 100, { operation: 'goal-contribution', linkedEntityId: 'g', category: 'savings' }),
      expense(3, 200, { operation: 'debt-payment', linkedEntityId: 'd', category: 'debt' }),
      expense(4, 50),
    ];

    const result = computeAllocation(snap, NOW);
    expect(result.slices.find((s) => s.id === 'spending')?.amount.minor).toBe(5000);
  });

  it('ignores transactions from other months and income entries', () => {
    const snap = baseSnapshot();
    snap.income = [{ id: 'inc', amount: fromMajor(1000), description: 'Sueldo', frequency: 'monthly', nextDate: '2026-01-30' }];
    snap.transactions = [
      { ...expense(2, 80), date: '2025-12-28' },
      { ...expense(3, 90), date: '2026-02-01' },
      { ...expense(4, 40), kind: 'income', category: 'salary' },
      expense(5, 30),
    ];

    const result = computeAllocation(snap, NOW);
    expect(result.slices.find((s) => s.id === 'spending')?.amount.minor).toBe(3000);
  });

  it('reports unknown income with zeroed slices for an empty account', () => {
    const result = computeAllocation(baseSnapshot(), NOW);
    expect(result.incomeUnknown).toBe(true);
    expect(result.income.minor).toBe(0);
    expect(result.overspent).toBe(false);
    expect(result.slices).toHaveLength(4);
    expect(result.slices.every((s) => s.amount.minor === 0 && s.share === 0)).toBe(true);
  });

  it('sums multiple income sources across frequencies', () => {
    const snap = baseSnapshot();
    snap.income = [
      { id: 'i1', amount: fromMajor(2000), description: 'Sueldo', frequency: 'monthly', nextDate: '2026-01-30' },
      { id: 'i2', amount: fromMajor(200), description: 'Freela', frequency: 'biweekly', nextDate: '2026-01-20' },
    ];
    expect(computeAllocation(snap, NOW).income.minor).toBe(240000);
  });

  it('threads the account currency through every slice', () => {
    const snap = baseSnapshot();
    snap.currentBalance = { minor: 100000, currency: 'USD' };
    snap.income = [{ id: 'inc', amount: { minor: 300000, currency: 'USD' }, description: 'Salary', frequency: 'monthly', nextDate: '2026-01-30' }];
    const result = computeAllocation(snap, NOW);
    expect(result.currency).toBe('USD');
    expect(result.slices.every((s) => s.amount.currency === 'USD')).toBe(true);
  });

  it('always returns the four slices in a stable order', () => {
    const snap = baseSnapshot();
    snap.income = [{ id: 'inc', amount: fromMajor(1000), description: 'Sueldo', frequency: 'monthly', nextDate: '2026-01-30' }];
    expect(computeAllocation(snap, NOW).slices.map((s) => s.id)).toEqual(['obligations', 'savings', 'spending', 'free']);
  });

  it('itemizes obligation and savings lines for the explainer', () => {
    const snap = baseSnapshot();
    snap.income = [{ id: 'inc', amount: fromMajor(3000), description: 'Sueldo', frequency: 'monthly', nextDate: '2026-01-30' }];
    snap.recurring = [{ id: 'rent', kind: 'expense', amount: fromMajor(900), category: 'housing', description: 'Alquiler', frequency: 'monthly', dayOfMonth: 5, essential: true }];
    snap.debts = [{ id: 'd', kind: 'card', name: 'Tarjeta', balance: fromMajor(2000), minimumPayment: fromMajor(150), annualRate: 0.4, dueDay: 20 }];
    snap.subscriptions = [{ id: 's', name: 'Netflix', amount: fromMajor(45), frequency: 'monthly', category: 'subscriptions', renewalDay: 10 }];
    snap.goals = [
      { id: 'g1', kind: 'emergency', name: 'Fondo', target: fromMajor(6000), saved: fromMajor(0), monthlyContribution: fromMajor(200), priority: 'high' },
      { id: 'g2', kind: 'travel', name: 'Viaje', target: fromMajor(3000), saved: fromMajor(0), monthlyContribution: fromMajor(0), priority: 'low' },
    ];

    const result = computeAllocation(snap, NOW);
    expect(result.obligationLines.map((l) => l.label)).toEqual(['Alquiler', 'Tarjeta (cuota)', 'Netflix']);
    expect(result.obligationLines.map((l) => l.amount.minor)).toEqual([90000, 15000, 4500]);
    // Goals without a commitment are not itemized.
    expect(result.savingsLines.map((l) => l.label)).toEqual(['Fondo']);
  });

  it('works with today as the reference date', () => {
    const snap = baseSnapshot();
    snap.income = [{ id: 'inc', amount: fromMajor(1000), description: 'Sueldo', frequency: 'monthly', nextDate: '2026-01-30' }];
    snap.transactions = [{ ...expense(1, 25), date: toISODate(new Date()) }];
    const result = computeAllocation(snap);
    expect(result.slices.find((s) => s.id === 'spending')?.amount.minor).toBe(2500);
  });
});
