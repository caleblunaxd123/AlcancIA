import type { Money } from './money';

/** Kind of shared group. Only drives copy and icon — the math is the same. */
export type GroupKind = 'couple' | 'family' | 'roommates' | 'friends';

export type GroupMember = {
  id: string;
  name: string;
  /** The device owner. Exactly one member per group has this. */
  isMe: boolean;
  /** Optional monthly income (minor units) for proportional splits. */
  incomeMinor?: number;
};

export type SharedGroup = {
  id: string;
  name: string;
  kind: GroupKind;
  members: GroupMember[];
  createdAt: string;
};

export type SplitMode = 'equal' | 'proportional' | 'custom';

export type ExpenseShare = { memberId: string; amountMinor: number };

export type SharedExpense = {
  id: string;
  groupId: string;
  description: string;
  amount: Money;
  paidBy: string;
  mode: SplitMode;
  shares: ExpenseShare[];
  /** ISO date. */
  date: string;
};

/** A repayment between two members ("Ana le pagó a Luis"). */
export type Settlement = {
  id: string;
  groupId: string;
  from: string;
  to: string;
  amount: Money;
  date: string;
};
