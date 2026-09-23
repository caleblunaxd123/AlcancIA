import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isValidMoney } from '@/engine/money';
import { emptySnapshot } from '@/engine/onboarding';
import type { Debt, FinancialSnapshot, Goal, Subscription, Transaction } from '@/types/domain';
import { toISODate } from '@/utils/date';
import { createId } from '@/utils/id';
import { secureFinancialStorage } from './secureStorage';

export type FinancialActionResult = { ok: true } | { ok: false; error: string };

const ok = (): FinancialActionResult => ({ ok: true });
const fail = (error: string): FinancialActionResult => ({ ok: false, error });
const sameCurrency = (snapshot: FinancialSnapshot, currency: string) => snapshot.currentBalance.currency === currency;

function validGoal(goal: Goal, snapshot: FinancialSnapshot): boolean {
  return Boolean(goal.id && goal.name.trim())
    && sameCurrency(snapshot, goal.target.currency)
    && goal.saved.currency === goal.target.currency
    && goal.monthlyContribution.currency === goal.target.currency
    && isValidMoney(goal.target, { positive: true })
    && isValidMoney(goal.saved) && goal.saved.minor >= 0 && goal.saved.minor <= goal.target.minor
    && isValidMoney(goal.monthlyContribution) && goal.monthlyContribution.minor >= 0;
}

function validDebt(debt: Debt, snapshot: FinancialSnapshot): boolean {
  return Boolean(debt.id && debt.name.trim())
    && sameCurrency(snapshot, debt.balance.currency)
    && debt.minimumPayment.currency === debt.balance.currency
    && isValidMoney(debt.balance, { positive: true })
    && isValidMoney(debt.minimumPayment, { positive: true })
    && Number.isFinite(debt.annualRate) && debt.annualRate >= 0
    && debt.dueDay >= 1 && debt.dueDay <= 31;
}

type FinancialState = {
  snapshot: FinancialSnapshot;
  hydrated: boolean;
  setSnapshot: (snapshot: FinancialSnapshot) => void;
  reset: () => void;
  addTransaction: (transaction: Transaction) => FinancialActionResult;
  updateTransaction: (id: string, patch: Partial<Transaction>) => FinancialActionResult;
  deleteTransaction: (id: string) => FinancialActionResult;
  addGoal: (goal: Goal) => FinancialActionResult;
  updateGoal: (id: string, patch: Partial<Goal>) => FinancialActionResult;
  deleteGoal: (id: string) => FinancialActionResult;
  contributeToGoal: (goalId: string, amountMinor: number) => FinancialActionResult;
  addDebt: (debt: Debt) => FinancialActionResult;
  updateDebt: (id: string, patch: Partial<Debt>) => FinancialActionResult;
  deleteDebt: (id: string) => FinancialActionResult;
  payDebt: (id: string, amountMinor: number) => FinancialActionResult;
  addSubscription: (subscription: Subscription) => FinancialActionResult;
  updateSubscription: (id: string, patch: Partial<Subscription>) => FinancialActionResult;
  deleteSubscription: (id: string) => FinancialActionResult;
};

export const useFinancialStore = create<FinancialState>()(
  persist(
    (set, get) => ({
      snapshot: emptySnapshot(),
      hydrated: false,
      setSnapshot: (snapshot) => set({ snapshot }),
      reset: () => set({ snapshot: emptySnapshot() }),

      addTransaction: (transaction) => {
        const snapshot = get().snapshot;
        if (snapshot.transactions.some((item) => item.id === transaction.id)) return fail('Este movimiento ya existe.');
        if (!sameCurrency(snapshot, transaction.amount.currency)) return fail('La moneda no coincide con la cuenta.');
        if (!isValidMoney(transaction.amount, { positive: true })) return fail('Ingresa un monto válido mayor a cero.');
        set({ snapshot: {
          ...snapshot,
          transactions: [{ ...transaction, operation: transaction.operation ?? 'manual' }, ...snapshot.transactions],
          currentBalance: { ...snapshot.currentBalance, minor: snapshot.currentBalance.minor + (transaction.kind === 'expense' ? -transaction.amount.minor : transaction.amount.minor) },
        } });
        return ok();
      },

      updateTransaction: (id, patch) => {
        const snapshot = get().snapshot;
        const current = snapshot.transactions.find((item) => item.id === id);
        if (!current) return fail('Movimiento no encontrado.');
        if ((current.operation ?? 'manual') !== 'manual') return fail('Los aportes y pagos enlazados no se pueden editar. Puedes revertirlos eliminando el movimiento.');
        const updated: Transaction = { ...current, ...patch, id: current.id, operation: 'manual', linkedEntityId: undefined };
        if (!sameCurrency(snapshot, updated.amount.currency) || !isValidMoney(updated.amount, { positive: true }) || !updated.description.trim() || !updated.date) {
          return fail('Revisa los datos del movimiento.');
        }
        const effect = (transaction: Transaction) => transaction.kind === 'expense' ? -transaction.amount.minor : transaction.amount.minor;
        set({ snapshot: {
          ...snapshot,
          transactions: snapshot.transactions.map((item) => item.id === id ? updated : item),
          currentBalance: { ...snapshot.currentBalance, minor: snapshot.currentBalance.minor - effect(current) + effect(updated) },
        } });
        return ok();
      },

      deleteTransaction: (id) => {
        const snapshot = get().snapshot;
        const transaction = snapshot.transactions.find((item) => item.id === id);
        if (!transaction) return fail('Movimiento no encontrado.');
        const goals = transaction.operation === 'goal-contribution' && transaction.linkedEntityId
          ? snapshot.goals.map((goal) => goal.id === transaction.linkedEntityId
            ? { ...goal, saved: { ...goal.saved, minor: Math.max(0, goal.saved.minor - transaction.amount.minor) } }
            : goal)
          : snapshot.goals;
        const debts = transaction.operation === 'debt-payment' && transaction.linkedEntityId
          ? snapshot.debts.map((debt) => debt.id === transaction.linkedEntityId
            ? { ...debt, balance: { ...debt.balance, minor: debt.balance.minor + transaction.amount.minor } }
            : debt)
          : snapshot.debts;
        set({ snapshot: {
          ...snapshot,
          goals,
          debts,
          transactions: snapshot.transactions.filter((item) => item.id !== id),
          currentBalance: { ...snapshot.currentBalance, minor: snapshot.currentBalance.minor + (transaction.kind === 'expense' ? transaction.amount.minor : -transaction.amount.minor) },
        } });
        return ok();
      },

      addGoal: (goal) => {
        const snapshot = get().snapshot;
        if (snapshot.goals.some((item) => item.id === goal.id)) return fail('Esta meta ya existe.');
        if (!validGoal(goal, snapshot)) return fail('Revisa los datos y montos de la meta.');
        set({ snapshot: { ...snapshot, goals: [...snapshot.goals, goal] } });
        return ok();
      },
      updateGoal: (id, patch) => {
        const snapshot = get().snapshot;
        const current = snapshot.goals.find((goal) => goal.id === id);
        if (!current) return fail('Meta no encontrada.');
        const updated = { ...current, ...patch };
        if (!validGoal(updated, snapshot)) return fail('La actualización dejaría la meta con datos inválidos.');
        set({ snapshot: { ...snapshot, goals: snapshot.goals.map((goal) => goal.id === id ? updated : goal) } });
        return ok();
      },
      deleteGoal: (id) => {
        const snapshot = get().snapshot;
        if (!snapshot.goals.some((goal) => goal.id === id)) return fail('Meta no encontrada.');
        set({ snapshot: { ...snapshot, goals: snapshot.goals.filter((goal) => goal.id !== id) } });
        return ok();
      },
      contributeToGoal: (goalId, amountMinor) => {
        const snapshot = get().snapshot;
        const goal = snapshot.goals.find((item) => item.id === goalId);
        if (!goal) return fail('Meta no encontrada.');
        if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return fail('Ingresa un aporte válido mayor a cero.');
        if (amountMinor > snapshot.currentBalance.minor) return fail('Tu saldo disponible no alcanza para este aporte.');
        if (amountMinor > goal.target.minor - goal.saved.minor) return fail('El aporte supera lo que falta para completar la meta.');
        const transaction: Transaction = {
          id: createId('goal'), kind: 'expense', amount: { minor: amountMinor, currency: goal.saved.currency },
          category: 'savings', description: `Aporte a ${goal.name}`, date: toISODate(new Date()), certainty: 'real',
          source: 'manual', operation: 'goal-contribution', linkedEntityId: goal.id,
        };
        set({ snapshot: {
          ...snapshot,
          goals: snapshot.goals.map((item) => item.id === goalId ? { ...item, saved: { ...item.saved, minor: item.saved.minor + amountMinor } } : item),
          transactions: [transaction, ...snapshot.transactions],
          currentBalance: { ...snapshot.currentBalance, minor: snapshot.currentBalance.minor - amountMinor },
        } });
        return ok();
      },

      addDebt: (debt) => {
        const snapshot = get().snapshot;
        if (snapshot.debts.some((item) => item.id === debt.id)) return fail('Esta deuda ya existe.');
        if (!validDebt(debt, snapshot)) return fail('Revisa los datos y montos de la deuda.');
        set({ snapshot: { ...snapshot, debts: [...snapshot.debts, debt] } });
        return ok();
      },
      updateDebt: (id, patch) => {
        const snapshot = get().snapshot;
        const current = snapshot.debts.find((item) => item.id === id);
        if (!current) return fail('Deuda no encontrada.');
        const updated = { ...current, ...patch, id: current.id };
        if (!validDebt(updated, snapshot)) return fail('Revisa los datos y montos de la deuda.');
        set({ snapshot: { ...snapshot, debts: snapshot.debts.map((item) => item.id === id ? updated : item) } });
        return ok();
      },
      deleteDebt: (id) => {
        const snapshot = get().snapshot;
        if (!snapshot.debts.some((debt) => debt.id === id)) return fail('Deuda no encontrada.');
        set({ snapshot: { ...snapshot, debts: snapshot.debts.filter((debt) => debt.id !== id) } });
        return ok();
      },
      payDebt: (id, amountMinor) => {
        const snapshot = get().snapshot;
        const debt = snapshot.debts.find((item) => item.id === id);
        if (!debt) return fail('Deuda no encontrada.');
        if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return fail('Ingresa un pago válido mayor a cero.');
        if (amountMinor > debt.balance.minor) return fail('El pago supera el saldo de la deuda.');
        if (amountMinor > snapshot.currentBalance.minor) return fail('Tu saldo disponible no alcanza para este pago.');
        const transaction: Transaction = {
          id: createId('debt'), kind: 'expense', amount: { minor: amountMinor, currency: debt.balance.currency },
          category: 'debt', description: `Pago de ${debt.name}`, date: toISODate(new Date()), certainty: 'real',
          source: 'manual', operation: 'debt-payment', linkedEntityId: debt.id,
        };
        set({ snapshot: {
          ...snapshot,
          debts: snapshot.debts.map((item) => item.id === id ? { ...item, balance: { ...item.balance, minor: item.balance.minor - amountMinor } } : item),
          transactions: [transaction, ...snapshot.transactions],
          currentBalance: { ...snapshot.currentBalance, minor: snapshot.currentBalance.minor - amountMinor },
        } });
        return ok();
      },

      addSubscription: (subscription) => {
        const snapshot = get().snapshot;
        if (snapshot.subscriptions.some((item) => item.id === subscription.id)) return fail('Esta suscripción ya existe.');
        if (!subscription.name.trim() || !sameCurrency(snapshot, subscription.amount.currency)
          || !isValidMoney(subscription.amount, { positive: true }) || subscription.renewalDay < 1 || subscription.renewalDay > 31) {
          return fail('Revisa los datos de la suscripción.');
        }
        set({ snapshot: { ...snapshot, subscriptions: [...snapshot.subscriptions, subscription] } });
        return ok();
      },
      updateSubscription: (id, patch) => {
        const snapshot = get().snapshot;
        const current = snapshot.subscriptions.find((item) => item.id === id);
        if (!current) return fail('Suscripción no encontrada.');
        const updated = { ...current, ...patch, id: current.id };
        if (!updated.name.trim() || !sameCurrency(snapshot, updated.amount.currency)
          || !isValidMoney(updated.amount, { positive: true }) || updated.renewalDay < 1 || updated.renewalDay > 31) {
          return fail('Revisa los datos de la suscripción.');
        }
        set({ snapshot: { ...snapshot, subscriptions: snapshot.subscriptions.map((item) => item.id === id ? updated : item) } });
        return ok();
      },
      deleteSubscription: (id) => {
        const snapshot = get().snapshot;
        if (!snapshot.subscriptions.some((subscription) => subscription.id === id)) return fail('Suscripción no encontrada.');
        set({ snapshot: { ...snapshot, subscriptions: snapshot.subscriptions.filter((subscription) => subscription.id !== id) } });
        return ok();
      },
    }),
    {
      name: 'alcancia-financial',
      storage: createJSONStorage(() => secureFinancialStorage),
      partialize: (state) => ({ snapshot: state.snapshot }),
      version: 2,
      migrate: (persisted) => persisted as FinancialState,
    },
  ),
);

useFinancialStore.persist.onFinishHydration(() => {
  useFinancialStore.setState({ hydrated: true });
});
