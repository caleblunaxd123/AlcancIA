/**
 * Demo dataset (§59/§76). A realistic Peruvian household so the whole experience
 * is explorable with zero setup. Amounts are in céntimos (PEN).
 */
import { fromMajor } from '@/engine/money';
import type { FinancialSnapshot, Goal, Transaction } from '@/types/domain';
import { addDays, toISODate } from '@/utils/date';

const today = new Date();
const iso = (offsetDays: number) => toISODate(addDays(today, offsetDays));

function nextPayDay(): string {
  // Next 30th of the month.
  const d = new Date(today.getFullYear(), today.getMonth(), 30);
  if (d.getTime() < today.setHours(0, 0, 0, 0)) {
    return toISODate(new Date(today.getFullYear(), today.getMonth() + 1, 30));
  }
  return toISODate(d);
}

const recentTransactions: Transaction[] = [
  { id: 't1', kind: 'expense', amount: fromMajor(42.9), category: 'delivery', description: 'Rappi', date: iso(-1), certainty: 'real', source: 'yape' },
  { id: 't2', kind: 'expense', amount: fromMajor(18.5), category: 'transport', description: 'Uber', date: iso(-1), certainty: 'real', source: 'yape' },
  { id: 't3', kind: 'expense', amount: fromMajor(63.0), category: 'food', description: 'Mercado', date: iso(-2), certainty: 'real', source: 'manual' },
  { id: 't4', kind: 'expense', amount: fromMajor(35.0), category: 'transport', description: 'Taxi', date: iso(-3), certainty: 'real', source: 'voice' },
  { id: 't5', kind: 'expense', amount: fromMajor(89.9), category: 'shopping', description: 'Farmacia', date: iso(-4), certainty: 'real', source: 'receipt' },
  { id: 't6', kind: 'expense', amount: fromMajor(52.0), category: 'food', description: 'Pollería', date: iso(-5), certainty: 'real', source: 'manual' },
  { id: 't7', kind: 'expense', amount: fromMajor(27.5), category: 'delivery', description: 'PedidosYa', date: iso(-6), certainty: 'real', source: 'plin' },
  { id: 't8', kind: 'income', amount: fromMajor(400.0), category: 'salary', description: 'Ingreso adicional', date: iso(-7), certainty: 'real', source: 'manual' },
  { id: 't9', kind: 'expense', amount: fromMajor(120.0), category: 'food', description: 'Supermercado', date: iso(-9), certainty: 'real', source: 'manual' },
  { id: 't10', kind: 'expense', amount: fromMajor(22.0), category: 'transport', description: 'Combustible', date: iso(-11), certainty: 'real', source: 'receipt' },
];

const goals: Goal[] = [
  {
    id: 'g1',
    kind: 'home',
    name: 'Inicial departamento',
    target: fromMajor(20000),
    saved: fromMajor(7240),
    targetDate: iso(520),
    monthlyContribution: fromMajor(800),
    priority: 'high',
  },
  {
    id: 'g2',
    kind: 'travel',
    name: 'Viaje a Cusco',
    target: fromMajor(1800),
    saved: fromMajor(620),
    targetDate: iso(90),
    monthlyContribution: fromMajor(300),
    priority: 'medium',
  },
  {
    id: 'g3',
    kind: 'emergency',
    name: 'Fondo de emergencia',
    target: fromMajor(6000),
    saved: fromMajor(3100),
    monthlyContribution: fromMajor(200),
    priority: 'high',
  },
];

export const demoSnapshot: FinancialSnapshot = {
  currentBalance: fromMajor(3210.5),
  safetyBuffer: fromMajor(300),
  income: [
    {
      id: 'inc1',
      amount: fromMajor(3500),
      description: 'Sueldo',
      frequency: 'monthly',
      nextDate: nextPayDay(),
    },
  ],
  recurring: [
    { id: 'r1', kind: 'expense', amount: fromMajor(1200), category: 'housing', description: 'Alquiler', frequency: 'monthly', dayOfMonth: 5, essential: true },
    { id: 'r2', kind: 'expense', amount: fromMajor(100), category: 'services', description: 'Internet', frequency: 'monthly', dayOfMonth: 8, essential: true },
    { id: 'r3', kind: 'expense', amount: fromMajor(150), category: 'services', description: 'Electricidad', frequency: 'monthly', dayOfMonth: 12, essential: true },
    { id: 'r4', kind: 'expense', amount: fromMajor(80), category: 'services', description: 'Agua', frequency: 'monthly', dayOfMonth: 12, essential: true },
  ],
  transactions: recentTransactions,
  goals,
  debts: [
    {
      id: 'd1',
      name: 'Tarjeta Interbank',
      kind: 'card',
      balance: fromMajor(2400),
      minimumPayment: fromMajor(300),
      annualRate: 0.55,
      dueDay: Math.min(28, today.getDate() + 4),
    },
  ],
  subscriptions: [
    { id: 's1', name: 'Netflix', amount: fromMajor(44.9), frequency: 'monthly', category: 'subscriptions', renewalDay: 15 },
    { id: 's2', name: 'Spotify', amount: fromMajor(21.9), frequency: 'monthly', category: 'subscriptions', renewalDay: 22 },
    { id: 's3', name: 'Gimnasio', amount: fromMajor(120), frequency: 'monthly', category: 'subscriptions', renewalDay: 3 },
  ],
};

export const demoUser = {
  name: 'Caleb',
  household: 'Familia Luna',
};
