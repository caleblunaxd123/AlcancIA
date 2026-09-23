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

  it('editing a manual transaction adjusts the balance by the difference', () => {
    const before = useFinancialStore.getState().snapshot.currentBalance.minor;
    useFinancialStore.getState().addTransaction(expense('edit-tx', 50));
    const result = useFinancialStore.getState().updateTransaction('edit-tx', { amount: fromMajor(80), description: 'Editado' });
    expect(result).toEqual({ ok: true });
    expect(useFinancialStore.getState().snapshot.currentBalance.minor).toBe(before - 8000);
    expect(useFinancialStore.getState().snapshot.transactions[0]!.description).toBe('Editado');
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
    const balanceBefore = useFinancialStore.getState().snapshot.currentBalance.minor;
    useFinancialStore.getState().contributeToGoal('g2', fromMajor(150).minor);
    const goal = useFinancialStore.getState().snapshot.goals.find((g) => g.id === 'g2');
    expect(goal!.saved.minor).toBe(25000); // 100 + 150
    expect(useFinancialStore.getState().snapshot.currentBalance.minor).toBe(balanceBefore - 15000);
    expect(useFinancialStore.getState().snapshot.transactions[0]).toMatchObject({
      operation: 'goal-contribution', linkedEntityId: 'g2', category: 'savings',
    });
  });

  it('reverses the goal and balance when its contribution movement is deleted', () => {
    useFinancialStore.getState().addGoal({
      id: 'g3', kind: 'travel', name: 'Viaje', target: fromMajor(2000), saved: fromMajor(0),
      monthlyContribution: fromMajor(100), priority: 'medium',
    });
    const before = useFinancialStore.getState().snapshot.currentBalance.minor;
    useFinancialStore.getState().contributeToGoal('g3', 10000);
    const movementId = useFinancialStore.getState().snapshot.transactions[0]!.id;
    useFinancialStore.getState().deleteTransaction(movementId);
    expect(useFinancialStore.getState().snapshot.currentBalance.minor).toBe(before);
    expect(useFinancialStore.getState().snapshot.goals[0]!.saved.minor).toBe(0);
  });

  it('rejects a goal contribution when the available balance is insufficient', () => {
    useFinancialStore.getState().addGoal({
      id: 'g4', kind: 'home', name: 'Casa', target: fromMajor(5000), saved: fromMajor(0),
      monthlyContribution: fromMajor(100), priority: 'high',
    });
    const before = useFinancialStore.getState().snapshot;
    const result = useFinancialStore.getState().contributeToGoal('g4', fromMajor(1500).minor);
    expect(result.ok).toBe(false);
    expect(useFinancialStore.getState().snapshot).toEqual(before);
  });

  it('does not allow editing a transaction linked to a goal contribution', () => {
    useFinancialStore.getState().addGoal({ id: 'locked-goal', kind: 'travel', name: 'Viaje', target: fromMajor(1000), saved: fromMajor(0), monthlyContribution: fromMajor(0), priority: 'high' });
    useFinancialStore.getState().contributeToGoal('locked-goal', 1000);
    const movement = useFinancialStore.getState().snapshot.transactions[0]!;
    expect(useFinancialStore.getState().updateTransaction(movement.id, { amount: fromMajor(1) }).ok).toBe(false);
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
    expect(s.transactions[0]).toMatchObject({ operation: 'debt-payment', linkedEntityId: 'd1' });
  });

  it('rejects a payment larger than the debt balance', () => {
    useFinancialStore.getState().addDebt(debt);
    const result = useFinancialStore.getState().payDebt('d1', fromMajor(5000).minor);
    expect(result.ok).toBe(false);
    expect(useFinancialStore.getState().snapshot.debts[0]!.balance.minor).toBe(fromMajor(2400).minor);
  });

  it('edits a debt without changing the cash balance', () => {
    useFinancialStore.getState().addDebt(debt);
    const cash = useFinancialStore.getState().snapshot.currentBalance;
    expect(useFinancialStore.getState().updateDebt('d1', { name: 'Tarjeta editada', dueDay: 20 })).toEqual({ ok: true });
    expect(useFinancialStore.getState().snapshot.debts[0]).toMatchObject({ name: 'Tarjeta editada', dueDay: 20 });
    expect(useFinancialStore.getState().snapshot.currentBalance).toEqual(cash);
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

  it('edits a subscription in place', () => {
    useFinancialStore.getState().addSubscription(sub);
    expect(useFinancialStore.getState().updateSubscription('s1', { amount: fromMajor(49.9), renewalDay: 20 })).toEqual({ ok: true });
    expect(useFinancialStore.getState().snapshot.subscriptions[0]).toMatchObject({ renewalDay: 20, amount: fromMajor(49.9) });
  });
});
