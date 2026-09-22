import type { Money } from './money';

/** How confident we are about an amount on a timeline (§40). Never mix these. */
export type Certainty = 'real' | 'scheduled' | 'estimated' | 'ai';

export type TransactionKind = 'expense' | 'income';

export type CategoryId =
  | 'food'
  | 'delivery'
  | 'transport'
  | 'housing'
  | 'services'
  | 'health'
  | 'education'
  | 'entertainment'
  | 'shopping'
  | 'subscriptions'
  | 'debt'
  | 'savings'
  | 'salary'
  | 'transfer'
  | 'pets'
  | 'other';

export type Category = {
  id: CategoryId;
  label: string;
  /** Lucide icon name. */
  icon: string;
  /** Whether spend in this category counts as an essential obligation. */
  essential: boolean;
};

export type Transaction = {
  id: string;
  kind: TransactionKind;
  amount: Money;
  category: CategoryId;
  description: string;
  /** ISO date. */
  date: string;
  certainty: Certainty;
  source?: 'manual' | 'text' | 'voice' | 'receipt' | 'yape' | 'plin' | 'recurring';
  /** System operation that produced the movement. Used to reverse it safely. */
  operation?: 'manual' | 'goal-contribution' | 'debt-payment';
  /** Entity affected by a system operation. */
  linkedEntityId?: string;
};

export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export type RecurringTransaction = {
  id: string;
  kind: TransactionKind;
  amount: Money;
  category: CategoryId;
  description: string;
  frequency: Frequency;
  /** Day of month (1-31) for monthly, or ISO date anchor. */
  dayOfMonth?: number;
  /** Concrete occurrence used as the recurrence anchor. */
  nextDate?: string;
  essential: boolean;
};

export type Income = {
  id: string;
  amount: Money;
  description: string;
  frequency: Frequency;
  /** Next expected pay day, ISO date. */
  nextDate: string;
};

export type GoalKind =
  | 'home'
  | 'travel'
  | 'car'
  | 'education'
  | 'emergency'
  | 'wedding'
  | 'tech'
  | 'pet'
  | 'custom';

export type Goal = {
  id: string;
  kind: GoalKind;
  name: string;
  target: Money;
  saved: Money;
  /** ISO date the user hopes to reach it. */
  targetDate?: string;
  monthlyContribution: Money;
  priority: 'low' | 'medium' | 'high';
};

export type Debt = {
  id: string;
  name: string;
  kind: 'card' | 'loan' | 'installments' | 'credit' | 'personal';
  balance: Money;
  minimumPayment: Money;
  /** Annual interest rate as a fraction, e.g. 0.45 = 45% TEA. */
  annualRate: number;
  dueDay: number;
};

export type Subscription = {
  id: string;
  name: string;
  amount: Money;
  frequency: Frequency;
  category: CategoryId;
  renewalDay: number;
  /** Concrete next renewal. Required to model weekly and yearly plans correctly. */
  nextRenewalDate?: string;
};

export type WeatherState = 'calm' | 'stable' | 'tight' | 'attention' | 'stormy';

export type FinancialSnapshot = {
  currentBalance: Money;
  income: Income[];
  recurring: RecurringTransaction[];
  transactions: Transaction[];
  goals: Goal[];
  debts: Debt[];
  subscriptions: Subscription[];
  /** Cash the user always wants to keep untouched. */
  safetyBuffer: Money;
};
