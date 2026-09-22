import type { CategoryId, GoalKind } from './domain';

export type HouseholdType = 'solo' | 'couple' | 'family' | 'roommates';

/** A common obligation the user can toggle on during onboarding. */
export type ObligationChoice = {
  id: string;
  label: string;
  category: CategoryId;
  dayOfMonth: number;
  /** Amount in major units the user entered. */
  amount: number;
};

export type OnboardingGoalChoice = {
  kind: GoalKind;
  name: string;
  /** Target in major units. */
  target: number;
  /** Monthly contribution in major units. */
  monthlyContribution: number;
};

export type OnboardingAnswers = {
  name: string;
  householdType: HouseholdType;
  /** Current available money, major units. */
  currentBalance: number;
  /** Monthly income, major units. */
  monthlyIncome: number;
  /** Day of month income arrives. */
  payDay: number;
  obligations: ObligationChoice[];
  goal: OnboardingGoalChoice | null;
};

export const EMPTY_ONBOARDING: OnboardingAnswers = {
  name: '',
  householdType: 'solo',
  currentBalance: 0,
  monthlyIncome: 0,
  payDay: 30,
  obligations: [],
  goal: null,
};
