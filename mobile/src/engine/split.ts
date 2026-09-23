/**
 * Shared-expense math (§13/§14). Deterministic and in integer minor units:
 * every split sums EXACTLY to the total (largest-remainder rounding), and
 * balances/transfers are derived purely from recorded expenses + settlements.
 */
import type { ExpenseShare, GroupMember, SharedExpense, Settlement, SplitMode } from '@/types/shared';

/**
 * Distribute `totalMinor` across members by weight so the parts are integers
 * and add up to the total. Leftover céntimos go to the largest fractional
 * remainders (ties broken by member order), so nobody is systematically
 * favored and the sum is always exact.
 */
export function allocateByWeights(totalMinor: number, memberIds: string[], weights: number[]): ExpenseShare[] {
  if (memberIds.length === 0) return [];
  const safeWeights = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const weightSum = safeWeights.reduce((a, b) => a + b, 0);
  // All-zero weights fall back to an even split.
  const effective = weightSum > 0 ? safeWeights : memberIds.map(() => 1);
  const effectiveSum = effective.reduce((a, b) => a + b, 0);

  const raw = effective.map((w) => (totalMinor * w) / effectiveSum);
  const floors = raw.map((r) => Math.floor(r));
  let leftover = totalMinor - floors.reduce((a, b) => a + b, 0);

  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const amounts = [...floors];
  for (let k = 0; leftover > 0 && k < order.length; k++, leftover--) {
    amounts[order[k]!.i]! += 1;
  }
  return memberIds.map((memberId, i) => ({ memberId, amountMinor: amounts[i]! }));
}

/** Shares for the equal / proportional modes. Custom shares are provided by the user. */
export function splitExpense(totalMinor: number, members: GroupMember[], mode: Exclude<SplitMode, 'custom'>): ExpenseShare[] {
  const ids = members.map((m) => m.id);
  if (mode === 'proportional') {
    return allocateByWeights(totalMinor, ids, members.map((m) => m.incomeMinor ?? 0));
  }
  return allocateByWeights(totalMinor, ids, ids.map(() => 1));
}

/** Percentages (0..100, rounded) each member would carry in a proportional split. */
export function proportionalPercents(members: GroupMember[]): Record<string, number> {
  const shares = allocateByWeights(10000, members.map((m) => m.id), members.map((m) => m.incomeMinor ?? 0));
  return Object.fromEntries(shares.map((s) => [s.memberId, Math.round(s.amountMinor / 100)]));
}

/** True when custom shares are valid: non-negative and summing to the total. */
export function sharesMatchTotal(shares: ExpenseShare[], totalMinor: number): boolean {
  return shares.every((s) => s.amountMinor >= 0) && shares.reduce((a, s) => a + s.amountMinor, 0) === totalMinor;
}

/**
 * Net balance per member: positive = the group owes them, negative = they owe.
 * paid − owed across expenses, adjusted by settlements (paying someone back
 * raises your balance and lowers theirs).
 */
export function groupBalances(
  memberIds: string[],
  expenses: SharedExpense[],
  settlements: Settlement[],
): Record<string, number> {
  const balance: Record<string, number> = Object.fromEntries(memberIds.map((id) => [id, 0]));
  for (const e of expenses) {
    if (e.paidBy in balance) balance[e.paidBy]! += e.amount.minor;
    for (const s of e.shares) {
      if (s.memberId in balance) balance[s.memberId]! -= s.amountMinor;
    }
  }
  for (const s of settlements) {
    if (s.from in balance) balance[s.from]! += s.amount.minor;
    if (s.to in balance) balance[s.to]! -= s.amount.minor;
  }
  return balance;
}

export type Transfer = { from: string; to: string; amountMinor: number };

/**
 * Minimal-ish list of payments that settles everyone up: repeatedly match the
 * biggest debtor with the biggest creditor. At most n−1 transfers.
 */
export function suggestTransfers(balances: Record<string, number>): Transfer[] {
  const debtors = Object.entries(balances)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id, amount: -v }));
  const creditors = Object.entries(balances)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id, amount: v }));

  const transfers: Transfer[] = [];
  while (debtors.length > 0 && creditors.length > 0) {
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);
    const d = debtors[0]!;
    const c = creditors[0]!;
    const amount = Math.min(d.amount, c.amount);
    if (amount > 0) transfers.push({ from: d.id, to: c.id, amountMinor: amount });
    d.amount -= amount;
    c.amount -= amount;
    if (d.amount === 0) debtors.shift();
    if (c.amount === 0) creditors.shift();
  }
  return transfers;
}
