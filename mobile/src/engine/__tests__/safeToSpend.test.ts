import { calculateSafeToSpend } from '@/engine/safeToSpend';
import { fromMajor } from '@/engine/money';
import type { FinancialSnapshot } from '@/types/domain';

function baseSnapshot(): FinancialSnapshot {
  return {
    currentBalance: fromMajor(1800),
    safetyBuffer: fromMajor(100),
    income: [
      {
        id: 'inc',
        amount: fromMajor(3500),
        description: 'Sueldo',
        frequency: 'monthly',
        nextDate: '2026-01-16',
      },
    ],
    recurring: [
      {
        id: 'rent',
        kind: 'expense',
        amount: fromMajor(900),
        category: 'housing',
        description: 'Alquiler',
        frequency: 'monthly',
        dayOfMonth: 5,
        essential: true,
      },
    ],
    transactions: [],
    goals: [
      {
        id: 'g',
        kind: 'custom',
        name: 'Meta',
        target: fromMajor(5000),
        saved: fromMajor(1000),
        monthlyContribution: fromMajor(120),
        priority: 'high',
      },
    ],
    debts: [],
    subscriptions: [],
  };
}

const AS_OF = new Date('2026-01-01T12:00:00');

describe('calculateSafeToSpend', () => {
  it('reserves obligations, savings, and buffer from the balance', () => {
    // 1800 - 900 rent - (120 * 15/30 = 60) savings - 100 buffer = 740
    const result = calculateSafeToSpend(baseSnapshot(), AS_OF);
    expect(result.amount.minor).toBe(74000);
    expect(result.clamped).toBe(false);
    expect(result.daysUntilIncome).toBe(15);
    expect(result.nextIncomeDate).toBe('2026-01-16');
  });

  it('produces an explainable breakdown', () => {
    const result = calculateSafeToSpend(baseSnapshot(), AS_OF);
    const keys = result.breakdown.map((l) => l.key);
    expect(keys).toContain('balance');
    expect(keys).toContain('obligation-rent');
    expect(keys).toContain('savings');
    expect(keys).toContain('buffer');
    // Balance is the only additive line.
    expect(result.breakdown.filter((l) => l.direction === 'add')).toHaveLength(1);
  });

  it('never returns a negative displayed amount but flags it as clamped', () => {
    const snap = baseSnapshot();
    snap.currentBalance = fromMajor(500); // below obligations
    const result = calculateSafeToSpend(snap, AS_OF);
    expect(result.amount.minor).toBe(0);
    expect(result.clamped).toBe(true);
  });

  it('excludes obligations that fall after the next income', () => {
    const snap = baseSnapshot();
    // Rent on day 20 is after the Jan 16 income, so it should not be reserved.
    snap.recurring[0]!.dayOfMonth = 20;
    const result = calculateSafeToSpend(snap, AS_OF);
    // 1800 - 60 savings - 100 buffer = 1640
    expect(result.amount.minor).toBe(164000);
  });
});
