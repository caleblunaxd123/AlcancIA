import { computeNextStep } from '@/engine/nextStep';
import { fromMajor } from '@/engine/money';
import type { FinancialSnapshot, Transaction } from '@/types/domain';

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

function expense(id: string): Transaction {
  return { id, kind: 'expense', amount: fromMajor(20), category: 'food', description: 'x', date: '2026-01-05', certainty: 'real', source: 'manual' };
}

const NOW = new Date('2026-01-10T12:00:00');

function withIncome(snap: FinancialSnapshot): FinancialSnapshot {
  snap.income = [{ id: 'inc', amount: fromMajor(3000), description: 'Sueldo', frequency: 'monthly', nextDate: '2026-01-30' }];
  return snap;
}

describe('computeNextStep', () => {
  it('asks for income first on a brand-new account', () => {
    expect(computeNextStep(baseSnapshot(), {}, NOW).id).toBe('register-income');
  });

  it('counts a recorded income transaction as having income', () => {
    const snap = baseSnapshot();
    snap.transactions = [{ ...expense('i1'), kind: 'income', category: 'salary' }];
    expect(computeNextStep(snap, {}, NOW).id).toBe('record-spending');
  });

  it('asks for spending habits until three real expenses exist', () => {
    const snap = withIncome(baseSnapshot());
    snap.transactions = [expense('e1'), expense('e2')];
    expect(computeNextStep(snap, {}, NOW).id).toBe('record-spending');

    snap.transactions = [expense('e1'), expense('e2'), expense('e3')];
    expect(computeNextStep(snap, {}, NOW).id).toBe('create-goal');
  });

  it('ignores system operations when counting spending', () => {
    const snap = withIncome(baseSnapshot());
    snap.transactions = [
      expense('e1'), expense('e2'),
      { ...expense('e3'), operation: 'goal-contribution' },
      { ...expense('e4'), operation: 'debt-payment' },
    ];
    expect(computeNextStep(snap, {}, NOW).id).toBe('record-spending');
  });

  it('prioritizes a debt due within five days', () => {
    const snap = withIncome(baseSnapshot());
    snap.transactions = [expense('e1'), expense('e2'), expense('e3')];
    snap.goals = [{ id: 'g', kind: 'emergency', name: 'Fondo', target: fromMajor(6000), saved: fromMajor(0), monthlyContribution: fromMajor(100), priority: 'high' }];
    snap.debts = [{ id: 'd', kind: 'card', name: 'Tarjeta', balance: fromMajor(1000), minimumPayment: fromMajor(100), annualRate: 0.4, dueDay: 13 }];
    expect(computeNextStep(snap, {}, NOW).id).toBe('review-debt');
  });

  it('does not cry debt for a due day far away', () => {
    const snap = withIncome(baseSnapshot());
    snap.transactions = [expense('e1'), expense('e2'), expense('e3')];
    snap.goals = [{ id: 'g', kind: 'emergency', name: 'Fondo', target: fromMajor(6000), saved: fromMajor(0), monthlyContribution: fromMajor(100), priority: 'high' }];
    snap.debts = [{ id: 'd', kind: 'card', name: 'Tarjeta', balance: fromMajor(1000), minimumPayment: fromMajor(100), annualRate: 0.4, dueDay: 25 }];
    expect(computeNextStep(snap, {}, NOW).id).toBe('try-simulator');
  });

  it('suggests obligations when the month has none', () => {
    const snap = withIncome(baseSnapshot());
    snap.transactions = [expense('e1'), expense('e2'), expense('e3')];
    snap.goals = [{ id: 'g', kind: 'travel', name: 'Viaje', target: fromMajor(3000), saved: fromMajor(0), monthlyContribution: fromMajor(0), priority: 'low' }];
    expect(computeNextStep(snap, {}, NOW).id).toBe('add-obligations');
  });

  it('walks through simulator, then AI, then calm once everything is set', () => {
    const snap = withIncome(baseSnapshot());
    snap.transactions = [expense('e1'), expense('e2'), expense('e3')];
    snap.goals = [{ id: 'g', kind: 'travel', name: 'Viaje', target: fromMajor(3000), saved: fromMajor(0), monthlyContribution: fromMajor(0), priority: 'low' }];
    snap.subscriptions = [{ id: 's', name: 'Netflix', amount: fromMajor(45), frequency: 'monthly', category: 'subscriptions', renewalDay: 10 }];

    expect(computeNextStep(snap, {}, NOW).id).toBe('try-simulator');
    expect(computeNextStep(snap, { usedSimulator: true }, NOW).id).toBe('ask-ai');
    expect(computeNextStep(snap, { usedSimulator: true, askedAi: true }, NOW).id).toBe('all-set');
  });

  it('every step carries a title, body, icon, action and route', () => {
    const snap = baseSnapshot();
    const result = computeNextStep(snap, {}, NOW);
    expect(result.title.length).toBeGreaterThan(0);
    expect(result.body.length).toBeGreaterThan(0);
    expect(result.icon.length).toBeGreaterThan(0);
    expect(result.actionLabel.length).toBeGreaterThan(0);
    expect(result.href.startsWith('/')).toBe(true);
  });
});

describe('record-spending counts manual expenses', () => {
  it('manual expenses tagged "manual" count; goal contributions do not', () => {
    const base = computeNextStep;
    const tx = (id: string, operation?: 'manual' | 'goal-contribution') => ({
      id, kind: 'expense' as const, amount: { minor: 1000, currency: 'PEN' as const }, category: 'food' as const,
      description: 'x', date: '2026-09-20', certainty: 'real' as const, source: 'manual' as const, operation,
    });
    const snap = {
      currentBalance: { minor: 100000, currency: 'PEN' as const }, safetyBuffer: { minor: 0, currency: 'PEN' as const },
      income: [{ id: 'i', amount: { minor: 300000, currency: 'PEN' as const }, description: 'Sueldo', frequency: 'monthly' as const, nextDate: '2026-09-30' }],
      recurring: [], goals: [], debts: [], subscriptions: [],
      transactions: [tx('a', 'manual'), tx('b', 'manual'), tx('c', 'manual'), tx('d', 'goal-contribution')],
    };
    expect(base(snap).id).not.toBe('record-spending');
    expect(base({ ...snap, transactions: [tx('a', 'manual'), tx('d', 'goal-contribution'), tx('e', 'goal-contribution')] }).id).toBe('record-spending');
  });
});
