import { simulatePurchase } from '@/engine/purchase';
import { fromMajor } from '@/engine/money';
import type { FinancialSnapshot } from '@/types/domain';

function snapshot(): FinancialSnapshot {
  return {
    currentBalance: fromMajor(1800),
    safetyBuffer: fromMajor(100),
    income: [
      { id: 'i', amount: fromMajor(3500), description: 'Sueldo', frequency: 'monthly', nextDate: '2026-01-16' },
    ],
    recurring: [
      { id: 'rent', kind: 'expense', amount: fromMajor(900), category: 'housing', description: 'Alquiler', frequency: 'monthly', dayOfMonth: 5, essential: true },
    ],
    transactions: [],
    goals: [
      // Contribution 120/mo -> prorated 60 for a 15-day period, so
      // safe-to-spend = 1800 - 900 rent - 60 savings - 100 buffer = 740.
      { id: 'g', kind: 'home', name: 'Depa', target: fromMajor(20000), saved: fromMajor(7240), monthlyContribution: fromMajor(120), priority: 'high' },
    ],
    debts: [],
    subscriptions: [],
  };
}

const AS_OF = new Date('2026-01-01T12:00:00');

describe('simulatePurchase', () => {
  it('is compatible for a small purchase within the margin', () => {
    // safe-to-spend = 740; buying 100 leaves 640 (> 35% of 740).
    const sim = simulatePurchase(snapshot(), fromMajor(100).minor, AS_OF);
    expect(sim.verdict).toBe('compatible');
    expect(sim.after.minor).toBe(64000);
    expect(sim.obligationsCovered).toBe(true);
    expect(sim.wouldExceed).toBe(false);
  });

  it('flags a purchase that eats most of the margin as tight', () => {
    // buying 600 leaves 140 (< 35% of 740).
    const sim = simulatePurchase(snapshot(), fromMajor(600).minor, AS_OF);
    expect(sim.verdict).toBe('tight');
  });

  it('flags a purchase beyond safe-to-spend as compromising obligations', () => {
    const sim = simulatePurchase(snapshot(), fromMajor(1000).minor, AS_OF);
    expect(sim.verdict).toBe('compromises');
    expect(sim.wouldExceed).toBe(true);
    expect(sim.after.minor).toBe(0);
    expect(sim.obligationsCovered).toBe(false);
  });

  it('does not report goal delay while a purchase stays inside safe-to-spend', () => {
    const sim = simulatePurchase(snapshot(), fromMajor(400).minor, AS_OF);
    expect(sim.goalImpact).toBeNull();
  });

  it('reports goal delay only for the portion beyond safe-to-spend', () => {
    const sim = simulatePurchase(snapshot(), fromMajor(1000).minor, AS_OF);
    expect(sim.goalImpact).not.toBeNull();
    expect(sim.goalImpact!.goal.id).toBe('g');
    expect(sim.goalImpact!.daysDelayed).toBeGreaterThan(0);
  });

  it('rejects zero and negative costs', () => {
    expect(() => simulatePurchase(snapshot(), 0, AS_OF)).toThrow(RangeError);
    expect(() => simulatePurchase(snapshot(), -100, AS_OF)).toThrow(RangeError);
  });

  it('never phrases the result as a command', () => {
    const sim = simulatePurchase(snapshot(), fromMajor(100).minor, AS_OF);
    expect(sim.headline.toLowerCase()).not.toContain('compra ');
    expect(sim.headline.toLowerCase()).not.toContain('no compres');
  });
});
