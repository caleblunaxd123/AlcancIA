import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isValidMoney } from '@/engine/money';
import { sharesMatchTotal } from '@/engine/split';
import type { GroupKind, GroupMember, SharedExpense, SharedGroup, Settlement } from '@/types/shared';
import { toISODate } from '@/utils/date';
import { createId } from '@/utils/id';
import { secureFinancialStorage } from './secureStorage';

export type SharedActionResult<T = undefined> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T,>(value: T): SharedActionResult<T> => ({ ok: true, value });
const fail = (error: string): SharedActionResult<never> => ({ ok: false, error });

export type NewGroupInput = {
  name: string;
  kind: GroupKind;
  me: { name: string; incomeMinor?: number };
  others: { name: string; incomeMinor?: number }[];
};

type SharedState = {
  groups: SharedGroup[];
  expenses: SharedExpense[];
  settlements: Settlement[];
  hydrated: boolean;

  createGroup: (input: NewGroupInput) => SharedActionResult<string>;
  deleteGroup: (id: string) => void;
  addExpense: (expense: Omit<SharedExpense, 'id'>) => SharedActionResult<string>;
  deleteExpense: (id: string) => void;
  addSettlement: (settlement: Omit<Settlement, 'id'>) => SharedActionResult<string>;
  reset: () => void;
};

/**
 * Shared groups live on this device only (local-first). They record who paid
 * what so balances can be computed; they never expose the owner's personal
 * movements — only what the owner deliberately adds to a group.
 */
export const useSharedStore = create<SharedState>()(
  persist(
    (set, get) => ({
      groups: [],
      expenses: [],
      settlements: [],
      hydrated: false,

      createGroup: (input) => {
        const name = input.name.trim();
        const others = input.others.map((o) => ({ ...o, name: o.name.trim() })).filter((o) => o.name.length > 0);
        if (!name) return fail('Ponle un nombre al grupo.');
        if (!input.me.name.trim()) return fail('Falta tu nombre.');
        if (others.length === 0) return fail('Agrega al menos a una persona.');
        const lower = new Set<string>();
        for (const n of [input.me.name.trim(), ...others.map((o) => o.name)]) {
          const key = n.toLowerCase();
          if (lower.has(key)) return fail(`"${n}" está repetido.`);
          lower.add(key);
        }
        const members: GroupMember[] = [
          { id: createId('mem'), name: input.me.name.trim(), isMe: true, incomeMinor: input.me.incomeMinor },
          ...others.map((o) => ({ id: createId('mem'), name: o.name, isMe: false, incomeMinor: o.incomeMinor })),
        ];
        const group: SharedGroup = { id: createId('grp'), name, kind: input.kind, members, createdAt: toISODate(new Date()) };
        set((s) => ({ groups: [group, ...s.groups] }));
        return ok(group.id);
      },

      deleteGroup: (id) =>
        set((s) => ({
          groups: s.groups.filter((g) => g.id !== id),
          expenses: s.expenses.filter((e) => e.groupId !== id),
          settlements: s.settlements.filter((x) => x.groupId !== id),
        })),

      addExpense: (expense) => {
        const group = get().groups.find((g) => g.id === expense.groupId);
        if (!group) return fail('El grupo ya no existe.');
        if (!expense.description.trim()) return fail('Describe el gasto.');
        if (!isValidMoney(expense.amount, { positive: true })) return fail('Ingresa un monto válido.');
        const ids = new Set(group.members.map((m) => m.id));
        if (!ids.has(expense.paidBy)) return fail('Elige quién pagó.');
        if (!expense.shares.every((s) => ids.has(s.memberId))) return fail('Hay una parte asignada a alguien fuera del grupo.');
        if (!sharesMatchTotal(expense.shares, expense.amount.minor)) return fail('Las partes deben sumar el total.');
        const saved: SharedExpense = { ...expense, id: createId('sxp'), description: expense.description.trim() };
        set((s) => ({ expenses: [saved, ...s.expenses] }));
        return ok(saved.id);
      },

      deleteExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

      addSettlement: (settlement) => {
        const group = get().groups.find((g) => g.id === settlement.groupId);
        if (!group) return fail('El grupo ya no existe.');
        const ids = new Set(group.members.map((m) => m.id));
        if (!ids.has(settlement.from) || !ids.has(settlement.to) || settlement.from === settlement.to) {
          return fail('Pago inválido.');
        }
        if (!isValidMoney(settlement.amount, { positive: true })) return fail('Ingresa un monto válido.');
        const saved: Settlement = { ...settlement, id: createId('stl') };
        set((s) => ({ settlements: [saved, ...s.settlements] }));
        return ok(saved.id);
      },

      reset: () => set({ groups: [], expenses: [], settlements: [] }),
    }),
    {
      name: 'alcancia-shared',
      storage: createJSONStorage(() => secureFinancialStorage),
      partialize: (s) => ({ groups: s.groups, expenses: s.expenses, settlements: s.settlements }),
      version: 1,
    },
  ),
);

useSharedStore.persist.onFinishHydration(() => {
  useSharedStore.setState({ hydrated: true });
});
