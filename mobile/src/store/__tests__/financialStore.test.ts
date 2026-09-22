import { fromMajor } from '@/engine/money';
import { buildSnapshotFromOnboarding } from '@/engine/onboarding';
import { useFinancialStore } from '@/store/financialStore';
import { EMPTY_ONBOARDING } from '@/types/onboarding';
import type { Transaction } from '@/types/domain';

function expense(id: string, major: number): Transaction {
  return {
    id,
    kind: 'expense',
    amount: fromMajor(major),
    category: 'food',
    description: 'Test',
    date: '2026-01-01',
    certainty: 'real',
    source: 'manual',
  };
}

beforeEach(() => {
  useFinancialStore.getState().setSnapshot(
    buildSnapshotFromOnboarding({ ...EMPTY_ONBOARDING, currentBalance: 1000, monthlyIncome: 3000 }),
  );
});

describe('financialStore CRUD', () => {
  it('adding an expense lowers the balance', () => {
    const before = useFinancialStore.getState().snapshot.currentBalance.minor;
    useFinancialStore.getState().addTransaction(expense('t1', 50));
    const s = useFinancialStore.getState().snapshot;
    expect(s.transactions).toHaveLength(1);
    expect(s.currentBalance.minor).toBe(before - 5000);
  });

  it('adding an income raises the balance', () => {
    const before = useFinancialStore.getState().snapshot.currentBalance.minor;
    useFinancialStore.getState().addTransaction({ ...expense('i1', 200), kind: 'income', category: 'salary' });
    expect(useFinancialStore.getState().snapshot.currentBalance.minor).toBe(before + 20000);
  });

  it('deleting a transaction reverses its balance effect', () => {
    const before = useFinancialStore.getState().snapshot.currentBalance.minor;
    useFinancialStore.getState().addTransaction(expense('t2', 80));
    useFinancialStore.getState().deleteTransaction('t2');
    const s = useFinancialStore.getState().snapshot;
    expect(s.transactions).toHaveLength(0);
    expect(s.currentBalance.minor).toBe(before);
  });

  it('creating and deleting a goal works', () => {
    useFinancialStore.getState().addGoal({
      id: 'g1', kind: 'travel', name: 'Cusco', target: fromMajor(1800), saved: fromMajor(0),
      monthlyContribution: fromMajor(300), priority: 'high',
    });
    expect(useFinancialStore.getState().snapshot.goals).toHaveLength(1);
    useFinancialStore.getState().deleteGoal('g1');
    expect(useFinancialStore.getState().snapshot.goals).toHaveLength(0);
  });

  it('contributing to a goal increases saved', () => {
    useFinancialStore.getState().addGoal({
      id: 'g2', kind: 'emergency', name: 'Fondo', target: fromMajor(6000), saved: fromMajor(100),
      monthlyContribution: fromMajor(200), priority: 'high',
    });
    useFinancialStore.getState().contributeToGoal('g2', fromMajor(150).minor);
    const goal = useFinancialStore.getState().snapshot.goals.find((g) => g.id === 'g2');
    expect(goal!.saved.minor).toBe(25000); // 100 + 150
  });
});

describe('financialStore debts', () => {
  const debt = {
    id: 'd1',
    name: 'Tarjeta',
    kind: 'card' as const,
    balance: fromMajor(2400),
    minimumPayment: fromMajor(300),
    annualRate: 0.55,
    dueDay: 15,
  };

  it('adds and deletes debts', () => {
    useFinancialStore.getState().addDebt(debt);
    expect(useFinancialStore.getState().snapshot.debts).toHaveLength(1);
    useFinancialStore.getState().deleteDebt('d1');
    expect(useFinancialStore.getState().snapshot.debts).toHaveLength(0);
  });

  it('paying a debt lowers both the debt balance and the current balance', () => {
    useFinancialStore.getState().addDebt(debt);
    const before = useFinancialStore.getState().snapshot.currentBalance.minor;
    useFinancialStore.getState().payDebt('d1', fromMajor(500).minor);
    const s = useFinancialStore.getState().snapshot;
    expect(s.debts[0]!.balance.minor).toBe(fromMajor(1900).minor);
    expect(s.currentBalance.minor).toBe(before - fromMajor(500).minor);
  });

  it('never lets a debt balance go negative', () => {
    useFinancialStore.getState().addDebt(debt);
    useFinancialStore.getState().payDebt('d1', fromMajor(5000).minor);
    expect(useFinancialStore.getState().snapshot.debts[0]!.balance.minor).toBe(0);
  });
});

describe('financialStore subscriptions', () => {
  const sub = {
    id: 's1',
    name: 'Netflix',
    amount: fromMajor(44.9),
    frequency: 'monthly' as const,
    category: 'subscriptions' as const,
    renewalDay: 15,
  };

  it('adds and deletes subscriptions', () => {
    useFinancialStore.getState().addSubscription(sub);
    expect(useFinancialStore.getState().snapshot.subscriptions).toHaveLength(1);
    useFinancialStore.getState().deleteSubscription('s1');
    expect(useFinancialStore.getState().snapshot.subscriptions).toHaveLength(0);
  });
});
