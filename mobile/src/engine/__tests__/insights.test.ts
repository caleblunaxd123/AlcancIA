import { generateInsights } from '@/engine/insights';
import { fromMajor } from '@/engine/money';
import type { FinancialSnapshot, Transaction } from '@/types/domain';
import { toISODate } from '@/utils/date';

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toISODate(d);
}

function deliveryTx(daysAgo: number, major: number): Transaction {
  return {
    id: `t-${daysAgo}-${major}`,
    kind: 'expense',
    amount: fromMajor(major),
    category: 'delivery',
    description: 'Delivery',
    date: daysAgoISO(daysAgo),
    certainty: 'real',
    source: 'manual',
  };
}

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

describe('generateInsights', () => {
  it('celebrates lower delivery spend week over week', () => {
    const snap = baseSnapshot();
    snap.transactions = [deliveryTx(1, 20), deliveryTx(8, 50)];
    const insights = generateInsights(snap);
    expect(insights).toHaveLength(1);
    expect(insights[0]!.id).toBe('delivery-down');
    expect(insights[0]!.tone).toBe('positive');
  });

  it('flags higher delivery spend softly, without shaming', () => {
    const snap = baseSnapshot();
    snap.transactions = [deliveryTx(1, 80), deliveryTx(8, 50)];
    const insights = generateInsights(snap);
    expect(insights).toHaveLength(1);
    expect(insights[0]!.id).toBe('delivery-up');
    expect(insights[0]!.tone).toBe('attention');
  });

  it('stays silent without a previous-week baseline', () => {
    const snap = baseSnapshot();
    snap.transactions = [deliveryTx(1, 80)];
    expect(generateInsights(snap)).toHaveLength(0);
  });

  it('ignores income and other categories in the delivery window', () => {
    const snap = baseSnapshot();
    snap.transactions = [
      deliveryTx(20, 50),
      { ...deliveryTx(1, 0), kind: 'income', amount: fromMajor(500), category: 'salary' },
      { ...deliveryTx(2, 90), category: 'food' },
    ];
    expect(generateInsights(snap)).toHaveLength(0);
  });

  it('recognizes an emergency fund covering a month of essentials', () => {
    const snap = baseSnapshot();
    snap.recurring = [
      { id: 'rent', kind: 'expense', amount: fromMajor(400), category: 'housing', description: 'Alquiler', frequency: 'monthly', dayOfMonth: 5, essential: true },
    ];
    snap.transactions = [{ ...deliveryTx(2, 100), category: 'food' }];
    snap.debts = [{ id: 'd', kind: 'card', name: 'Tarjeta', balance: fromMajor(1000), minimumPayment: fromMajor(28), annualRate: 0.4, dueDay: 20 }];
    snap.goals = [{ id: 'g', kind: 'emergency', name: 'Fondo', target: fromMajor(5000), saved: fromMajor(600), monthlyContribution: fromMajor(100), priority: 'high' }];

    const insights = generateInsights(snap);
    const milestone = insights.find((i) => i.id === 'emergency-milestone');
    expect(milestone?.tone).toBe('positive');
  });

  it('does not award the milestone before one month is covered', () => {
    const snap = baseSnapshot();
    snap.recurring = [
      { id: 'rent', kind: 'expense', amount: fromMajor(400), category: 'housing', description: 'Alquiler', frequency: 'monthly', dayOfMonth: 5, essential: true },
    ];
    snap.transactions = [{ ...deliveryTx(2, 100), category: 'food' }];
    snap.debts = [{ id: 'd', kind: 'card', name: 'Tarjeta', balance: fromMajor(1000), minimumPayment: fromMajor(28), annualRate: 0.4, dueDay: 20 }];
    snap.goals = [{ id: 'g', kind: 'emergency', name: 'Fondo', target: fromMajor(5000), saved: fromMajor(100), monthlyContribution: fromMajor(100), priority: 'high' }];

    expect(generateInsights(snap).find((i) => i.id === 'emergency-milestone')).toBeUndefined();
  });

  it('returns at most two insights', () => {
    const snap = baseSnapshot();
    snap.transactions = [deliveryTx(1, 20), deliveryTx(8, 50)];
    snap.recurring = [
      { id: 'rent', kind: 'expense', amount: fromMajor(100), category: 'housing', description: 'Alquiler', frequency: 'monthly', dayOfMonth: 5, essential: true },
    ];
    snap.goals = [{ id: 'g', kind: 'emergency', name: 'Fondo', target: fromMajor(5000), saved: fromMajor(600), monthlyContribution: fromMajor(100), priority: 'high' }];

    expect(generateInsights(snap)).toHaveLength(2);
  });
});
