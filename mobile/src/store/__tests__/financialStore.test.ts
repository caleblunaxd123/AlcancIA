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
