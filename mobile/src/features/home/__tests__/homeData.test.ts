import { computeHomeData } from '@/features/home/homeData';
import { fromMajor } from '@/engine/money';
import type { FinancialSnapshot } from '@/types/domain';
import { addDays, toISODate } from '@/utils/date';

function baseSnapshot(): FinancialSnapshot {
  return {
    currentBalance: fromMajor(1800),
    safetyBuffer: fromMajor(100),
    income: [],
    recurring: [],
    transactions: [],
    goals: [],
    debts: [],
    subscriptions: [],
  };
}

const AS_OF = new Date('2026-01-01T12:00:00');
const isoIn = (days: number) => toISODate(addDays(AS_OF, days));

describe('computeHomeData', () => {
  it('derives savings progress from the emergency goal when present', () => {
    const snap = baseSnapshot();
    snap.goals = [{ id: 'g', kind: 'emergency', name: 'Fondo', target: fromMajor(1000), saved: fromMajor(250), monthlyContribution: fromMajor(0), priority: 'high' }];
    const data = computeHomeData(snap, AS_OF);
    expect(data.savingsProgress).toBeCloseTo(0.25, 5);
  });

  it('averages real goals when there is no emergency goal (§27: never hardcoded)', () => {
    const snap = baseSnapshot();
    snap.goals = [
      { id: 'g1', kind: 'travel', name: 'Viaje', target: fromMajor(1000), saved: fromMajor(500), monthlyContribution: fromMajor(0), priority: 'medium' },
      { id: 'g2', kind: 'tech', name: 'Laptop', target: fromMajor(1000), saved: fromMajor(0), monthlyContribution: fromMajor(0), priority: 'low' },
    ];
    expect(computeHomeData(snap, AS_OF).savingsProgress).toBeCloseTo(0.25, 5);
  });

  it('reports zero progress with an empty account', () => {
    const data = computeHomeData(baseSnapshot(), AS_OF);
    expect(data.savingsProgress).toBe(0);
    expect(data.nextPayment).toBeNull();
    expect(data.topGoals).toHaveLength(0);
  });

  it('blends health from safe-to-spend state and savings progress, within bounds', () => {
    const snap = baseSnapshot();
    snap.income = [{ id: 'inc', amount: fromMajor(3500), description: 'Sueldo', frequency: 'monthly', nextDate: isoIn(15) }];
    snap.goals = [{ id: 'g', kind: 'emergency', name: 'Fondo', target: fromMajor(1000), saved: fromMajor(500), monthlyContribution: fromMajor(0), priority: 'high' }];
    const data = computeHomeData(snap, AS_OF);
    expect(data.health).toBeGreaterThanOrEqual(0.2);
    expect(data.health).toBeLessThanOrEqual(1);
    expect(data.savingsProgress).toBeCloseTo(0.5, 5);

    snap.currentBalance = fromMajor(10); // obligations clamp safe-to-spend
    expect(computeHomeData(snap, AS_OF).weather.safeToSpend.clamped).toBe(true);
  });

  it('picks the earliest upcoming payment across debts, subscriptions and bills', () => {
    const snap = baseSnapshot();
    snap.debts = [{ id: 'd', kind: 'card', name: 'Tarjeta', balance: fromMajor(1000), minimumPayment: fromMajor(100), annualRate: 0.4, dueDay: Number(isoIn(9).slice(8)) }];
    snap.subscriptions = [{ id: 's', name: 'Netflix', amount: fromMajor(44.9), frequency: 'monthly', category: 'subscriptions', renewalDay: 10, nextRenewalDate: isoIn(3) }];
    const data = computeHomeData(snap, AS_OF);
    expect(data.nextPayment?.label).toBe('Netflix');
    expect(data.nextPayment?.whenLabel).toBe('el domingo'); // 2026-01-04, within six days
    expect(data.nextPayment?.icon).toBe('repeat');
  });

  it('labels payments beyond six days with a day count', () => {
    const snap = baseSnapshot();
    snap.subscriptions = [{ id: 's', name: 'Seguro', amount: fromMajor(90), frequency: 'monthly', category: 'subscriptions', renewalDay: 10, nextRenewalDate: isoIn(9) }];
    expect(computeHomeData(snap, AS_OF).nextPayment?.whenLabel).toBe('en 9 días');
  });

  it('labels payments due today and tomorrow in human words', () => {
    const snap = baseSnapshot();
    snap.subscriptions = [{ id: 's', name: 'Spotify', amount: fromMajor(12), frequency: 'monthly', category: 'subscriptions', renewalDay: 1, nextRenewalDate: isoIn(0) }];
    expect(computeHomeData(snap, AS_OF).nextPayment?.whenLabel).toBe('hoy');

    snap.subscriptions[0]!.nextRenewalDate = isoIn(1);
    expect(computeHomeData(snap, AS_OF).nextPayment?.whenLabel).toBe('mañana');
  });

  it('uses weekday names within six days and orders goals by priority', () => {
    const snap = baseSnapshot();
    snap.subscriptions = [{ id: 's', name: 'Gym', amount: fromMajor(60), frequency: 'monthly', category: 'subscriptions', renewalDay: 3, nextRenewalDate: isoIn(5) }];
    snap.goals = [
      { id: 'g1', kind: 'travel', name: 'Viaje', target: fromMajor(1000), saved: fromMajor(0), monthlyContribution: fromMajor(0), priority: 'low' },
      { id: 'g2', kind: 'home', name: 'Casa', target: fromMajor(9000), saved: fromMajor(0), monthlyContribution: fromMajor(0), priority: 'high' },
      { id: 'g3', kind: 'car', name: 'Auto', target: fromMajor(5000), saved: fromMajor(0), monthlyContribution: fromMajor(0), priority: 'medium' },
    ];
    const data = computeHomeData(snap, AS_OF);
    expect(data.nextPayment?.whenLabel).toBe('el martes'); // 2026-01-06
    expect(data.topGoals.map((g) => g.name)).toEqual(['Casa', 'Auto', 'Viaje']);
    expect(data.upcoming[0]?.label).toBe('Gym');
  });
});
