import { deriveWeather, weatherEmoji } from '@/engine/weather';
import { fromMajor } from '@/engine/money';
import type { FinancialSnapshot } from '@/types/domain';

function baseSnapshot(): FinancialSnapshot {
  return {
    currentBalance: fromMajor(1800),
    safetyBuffer: fromMajor(100),
    income: [
      { id: 'inc', amount: fromMajor(3500), description: 'Sueldo', frequency: 'monthly', nextDate: '2026-01-16' },
    ],
    recurring: [
      { id: 'rent', kind: 'expense', amount: fromMajor(900), category: 'housing', description: 'Alquiler', frequency: 'monthly', dayOfMonth: 5, essential: true },
    ],
    transactions: [],
    goals: [],
    debts: [],
    subscriptions: [],
  };
}

const AS_OF = new Date('2026-01-01T12:00:00');

describe('deriveWeather', () => {
  it('reports calm when daily headroom comfortably covers the daily income pace', () => {
    const snap = baseSnapshot();
    snap.currentBalance = fromMajor(4000); // 4000-900-100 = 3000 over 15 days
    const result = deriveWeather(snap, AS_OF);
    expect(result.state).toBe('calm');
    expect(result.headline).toBe('Tu dinero está tranquilo hoy.');
    expect(result.safeToSpend.amount.minor).toBe(300000);
  });

  it('reports stable for moderate headroom', () => {
    const snap = baseSnapshot();
    snap.currentBalance = fromMajor(2500); // 2500-900-60-100 = 1440 over 15 days
    expect(deriveWeather(snap, AS_OF).state).toBe('stable');
  });

  it('reports tight when headroom is small but positive', () => {
    const result = deriveWeather(baseSnapshot(), AS_OF); // 740 over 15 days
    expect(result.state).toBe('tight');
  });

  it('reports stormy when obligations exceed the balance (clamped)', () => {
    const snap = baseSnapshot();
    snap.currentBalance = fromMajor(500);
    const result = deriveWeather(snap, AS_OF);
    expect(result.state).toBe('stormy');
    expect(result.safeToSpend.clamped).toBe(true);
  });

  it('includes calm, non-alarmist reasons', () => {
    const snap = baseSnapshot();
    snap.goals = [{ id: 'g', kind: 'custom', name: 'Meta', target: fromMajor(5000), saved: fromMajor(0), monthlyContribution: fromMajor(120), priority: 'high' }];
    const result = deriveWeather(snap, AS_OF);
    const texts = result.reasons.map((r) => r.text);
    expect(texts).toContain('Ingreso principal considerado');
    expect(texts).toContain('Obligaciones del periodo cubiertas');
    expect(texts).toContain('Plan de aportes configurado');
  });

  it('mentions obligations due within five days', () => {
    const snap = baseSnapshot();
    snap.subscriptions = [
      { id: 's', name: 'Netflix', amount: fromMajor(44.9), frequency: 'monthly', category: 'subscriptions', renewalDay: 4, nextRenewalDate: '2026-01-04' },
    ];
    const result = deriveWeather(snap, AS_OF);
    const soon = result.reasons.filter((r) => r.tone === 'attention');
    expect(soon).toHaveLength(1);
    expect(soon[0]!.text).toBe('Netflix vence en 3 días');
  });

  it('softens calm to stable under near-term pressure', () => {
    const snap = baseSnapshot();
    snap.currentBalance = fromMajor(4000);
    snap.debts = [
      { id: 'd1', kind: 'card', name: 'Tarjeta', balance: fromMajor(500), minimumPayment: fromMajor(50), annualRate: 0.4, dueDay: 3 },
      { id: 'd2', kind: 'loan', name: 'Préstamo', balance: fromMajor(500), minimumPayment: fromMajor(50), annualRate: 0.2, dueDay: 4 },
    ];
    snap.subscriptions = [
      { id: 's', name: 'Spotify', amount: fromMajor(12), frequency: 'monthly', category: 'subscriptions', renewalDay: 5, nextRenewalDate: '2026-01-05' },
    ];
    const result = deriveWeather(snap, AS_OF);
    expect(result.state).toBe('stable');
  });
});

describe('weatherEmoji', () => {
  it('maps every state to a weather emoji', () => {
    expect(weatherEmoji('calm')).toBe('☀️');
    expect(weatherEmoji('stable')).toBe('🌤️');
    expect(weatherEmoji('tight')).toBe('⛅');
    expect(weatherEmoji('attention')).toBe('🌧️');
    expect(weatherEmoji('stormy')).toBe('⛈️');
  });
});
