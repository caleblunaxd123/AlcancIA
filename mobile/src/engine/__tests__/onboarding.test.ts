import { buildSnapshotFromOnboarding, emptySnapshot } from '@/engine/onboarding';
import { calculateSafeToSpend } from '@/engine/safeToSpend';
import { EMPTY_ONBOARDING, type OnboardingAnswers } from '@/types/onboarding';

function answers(overrides: Partial<OnboardingAnswers> = {}): OnboardingAnswers {
  return { ...EMPTY_ONBOARDING, ...overrides };
}

describe('buildSnapshotFromOnboarding', () => {
  it('turns income and balance into a usable snapshot', () => {
    const snap = buildSnapshotFromOnboarding(
      answers({ name: 'Ana', currentBalance: 1800, monthlyIncome: 3500, payDay: 30 }),
    );
    expect(snap.currentBalance.minor).toBe(180000);
    expect(snap.income).toHaveLength(1);
    expect(snap.income[0]!.amount.minor).toBe(350000);
    expect(snap.income[0]!.nextDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('maps chosen obligations to essential recurring expenses', () => {
    const snap = buildSnapshotFromOnboarding(
      answers({
        monthlyIncome: 3000,
        obligations: [
          { id: 'rent', label: 'Alquiler', category: 'housing', dayOfMonth: 5, amount: 1200 },
        ],
      }),
    );
    expect(snap.recurring).toHaveLength(1);
    expect(snap.recurring[0]!.essential).toBe(true);
    expect(snap.recurring[0]!.amount.minor).toBe(120000);
  });

  it('creates the chosen goal starting at zero saved', () => {
    const snap = buildSnapshotFromOnboarding(
      answers({ goal: { kind: 'emergency', name: 'Fondo', target: 6000, monthlyContribution: 200 } }),
    );
    expect(snap.goals).toHaveLength(1);
    expect(snap.goals[0]!.saved.minor).toBe(0);
    expect(snap.goals[0]!.target.minor).toBe(600000);
  });

  it('adds a conservative safety buffer capped at 300', () => {
    const rich = buildSnapshotFromOnboarding(answers({ monthlyIncome: 10000 }));
    expect(rich.safetyBuffer.minor).toBe(30000); // capped at 300
    const modest = buildSnapshotFromOnboarding(answers({ monthlyIncome: 2000 }));
    expect(modest.safetyBuffer.minor).toBe(10000); // 5% of 2000
  });

  it('produces a snapshot the safe-to-spend engine can consume', () => {
    const snap = buildSnapshotFromOnboarding(
      answers({
        currentBalance: 2000,
        monthlyIncome: 3000,
        payDay: 30,
        obligations: [{ id: 'rent', label: 'Alquiler', category: 'housing', dayOfMonth: 5, amount: 900 }],
      }),
    );
    const result = calculateSafeToSpend(snap, new Date('2026-01-01T12:00:00'));
    expect(result.amount.minor).toBeGreaterThanOrEqual(0);
    expect(result.breakdown.some((l) => l.key === 'balance')).toBe(true);
  });

  it('emptySnapshot has no data but valid structure', () => {
    const snap = emptySnapshot();
    expect(snap.income).toHaveLength(0);
    expect(snap.transactions).toHaveLength(0);
    expect(snap.goals).toHaveLength(0);
    expect(snap.currentBalance.minor).toBe(0);
  });
});
