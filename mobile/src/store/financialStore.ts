import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { add } from '@/engine/money';
import { emptySnapshot } from '@/engine/onboarding';
import type { Debt, FinancialSnapshot, Goal, Subscription, Transaction } from '@/types/domain';

type FinancialState = {
  snapshot: FinancialSnapshot;
  hydrated: boolean;

  setSnapshot: (snapshot: FinancialSnapshot) => void;
  reset: () => void;

  addTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;

  addGoal: (g: Goal) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  contributeToGoal: (goalId: string, amountMinor: number) => void;

  addDebt: (d: Debt) => void;
  deleteDebt: (id: string) => void;
  payDebt: (id: string, amountMinor: number) => void;

  addSubscription: (s: Subscription) => void;
  deleteSubscription: (id: string) => void;
};

export const useFinancialStore = create<FinancialState>()(
  persist(
    (set) => ({
      snapshot: emptySnapshot(),
      hydrated: false,

      setSnapshot: (snapshot) => set({ snapshot }),
      reset: () => set({ snapshot: emptySnapshot() }),

      addTransaction: (t) =>
        set((state) => ({
          snapshot: {
            ...state.snapshot,
            transactions: [t, ...state.snapshot.transactions],
            currentBalance: {
              ...state.snapshot.currentBalance,
              minor:
                state.snapshot.currentBalance.minor +
                (t.kind === 'expense' ? -t.amount.minor : t.amount.minor),
            },
          },
        })),

      deleteTransaction: (id) =>
        set((state) => {
          const t = state.snapshot.transactions.find((x) => x.id === id);
          if (!t) return state;
          return {
            snapshot: {
              ...state.snapshot,
              transactions: state.snapshot.transactions.filter((x) => x.id !== id),
              // Reverse the balance effect of the removed movement.
              currentBalance: {
                ...state.snapshot.currentBalance,
                minor:
                  state.snapshot.currentBalance.minor +
                  (t.kind === 'expense' ? t.amount.minor : -t.amount.minor),
              },
            },
          };
        }),

      addGoal: (g) =>
        set((state) => ({ snapshot: { ...state.snapshot, goals: [...state.snapshot.goals, g] } })),

      updateGoal: (id, patch) =>
        set((state) => ({
          snapshot: {
            ...state.snapshot,
            goals: state.snapshot.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
          },
        })),

      deleteGoal: (id) =>
        set((state) => ({
          snapshot: { ...state.snapshot, goals: state.snapshot.goals.filter((g) => g.id !== id) },
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

      addDebt: (d) =>
        set((state) => ({ snapshot: { ...state.snapshot, debts: [...state.snapshot.debts, d] } })),

      deleteDebt: (id) =>
        set((state) => ({
          snapshot: { ...state.snapshot, debts: state.snapshot.debts.filter((d) => d.id !== id) },
        })),

      payDebt: (id, amountMinor) =>
        set((state) => ({
          snapshot: {
            ...state.snapshot,
            debts: state.snapshot.debts.map((d) =>
              d.id === id
                ? { ...d, balance: { ...d.balance, minor: Math.max(0, d.balance.minor - amountMinor) } }
                : d,
            ),
            currentBalance: {
              ...state.snapshot.currentBalance,
              minor: state.snapshot.currentBalance.minor - amountMinor,
            },
          },
        })),

      addSubscription: (s) =>
        set((state) => ({ snapshot: { ...state.snapshot, subscriptions: [...state.snapshot.subscriptions, s] } })),

      deleteSubscription: (id) =>
        set((state) => ({
          snapshot: { ...state.snapshot, subscriptions: state.snapshot.subscriptions.filter((s) => s.id !== id) },
        })),
    }),
    {
      name: 'alcancia-financial',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ snapshot: state.snapshot }),
    },
  ),
);

// Mutating state inside onRehydrateStorage would not notify subscribers, which
// can leave the splash gate stuck; setState is the only way to re-render.
useFinancialStore.persist.onFinishHydration(() => {
  useFinancialStore.setState({ hydrated: true });
});
