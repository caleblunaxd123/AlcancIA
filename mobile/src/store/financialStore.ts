import { create } from 'zustand';

import { demoSnapshot } from '@/data/demo';
import { add } from '@/engine/money';
import type { FinancialSnapshot, Goal, Transaction } from '@/types/domain';

type FinancialState = {
  snapshot: FinancialSnapshot;
  addTransaction: (t: Transaction) => void;
  contributeToGoal: (goalId: string, amountMinor: number) => void;
};

export const useFinancialStore = create<FinancialState>((set) => ({
  snapshot: demoSnapshot,
  addTransaction: (t) =>
    set((state) => ({
      snapshot: {
        ...state.snapshot,
        transactions: [t, ...state.snapshot.transactions],
        currentBalance:
          t.kind === 'expense'
            ? { ...state.snapshot.currentBalance, minor: state.snapshot.currentBalance.minor - t.amount.minor }
            : { ...state.snapshot.currentBalance, minor: state.snapshot.currentBalance.minor + t.amount.minor },
      },
    })),
  contributeToGoal: (goalId, amountMinor) =>
    set((state) => ({
      snapshot: {
        ...state.snapshot,
        goals: state.snapshot.goals.map((g: Goal) =>
          g.id === goalId
            ? { ...g, saved: add(g.saved, { minor: amountMinor, currency: g.saved.currency }) }
            : g,
        ),
      },
    })),
}));
