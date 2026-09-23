import { groupBalances, suggestTransfers, type Transfer } from '@/engine/split';
import type { GroupKind, GroupMember, SharedExpense, SharedGroup, Settlement } from '@/types/shared';

export type GroupSummary = {
  me: GroupMember | undefined;
  balances: Record<string, number>;
  /** Suggested payments that settle the group. */
  transfers: Transfer[];
  /** Positive: the group owes me. Negative: I owe. */
  myBalanceMinor: number;
  expenses: SharedExpense[];
  settlements: Settlement[];
  totalSpentMinor: number;
};

export function summarizeGroup(group: SharedGroup, allExpenses: SharedExpense[], allSettlements: Settlement[]): GroupSummary {
  const expenses = allExpenses
    .filter((e) => e.groupId === group.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const settlements = allSettlements.filter((s) => s.groupId === group.id);
  const balances = groupBalances(group.members.map((m) => m.id), expenses, settlements);
  const me = group.members.find((m) => m.isMe);
  return {
    me,
    balances,
    transfers: suggestTransfers(balances),
    myBalanceMinor: me ? balances[me.id] ?? 0 : 0,
    expenses,
    settlements,
    totalSpentMinor: expenses.reduce((a, e) => a + e.amount.minor, 0),
  };
}

export const GROUP_KINDS: { kind: GroupKind; label: string; icon: string; defaultName: string; example: string }[] = [
  { kind: 'couple', label: 'Pareja', icon: 'heart', defaultName: 'Nuestra casa', example: 'Alquiler, súper, salidas' },
  { kind: 'family', label: 'Familia', icon: 'house', defaultName: 'Gastos de la familia', example: 'Servicios, colegio, mercado' },
  { kind: 'roommates', label: 'Roommates', icon: 'key-round', defaultName: 'Depa compartido', example: 'Luz, agua, internet' },
  { kind: 'friends', label: 'Amigos / viaje', icon: 'plane', defaultName: 'Viaje con amigos', example: 'Hospedaje, comidas, taxis' },
];

export function kindMeta(kind: GroupKind) {
  return GROUP_KINDS.find((k) => k.kind === kind) ?? GROUP_KINDS[0]!;
}
