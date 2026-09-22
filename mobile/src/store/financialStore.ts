import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { add } from '@/engine/money';
import { emptySnapshot } from '@/engine/onboarding';
import type { FinancialSnapshot, Goal, Transaction } from '@/types/domain';

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
    }),
    {
      name: 'alcancia-financial',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ snapshot: state.snapshot }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);
