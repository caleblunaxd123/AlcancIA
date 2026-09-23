/**
 * "Tu siguiente paso" — a single, concrete suggested action derived from the
 * real account state. The user should never wonder "what do I do here?":
 * Home always shows ONE next step (plus optionally the first-run checklist).
 *
 * Deterministic and ordered by priority: basics first (know your balance,
 * register income), then habits (record spending, create a goal), then
 * time-sensitive items (upcoming debt), then exploration features.
 */
import { daysBetween, nextDayOfMonth } from '@/utils/date';
import type { FinancialSnapshot } from '@/types/domain';

export type NextStepId =
  | 'register-income'
  | 'record-spending'
  | 'create-goal'
  | 'review-debt'
  | 'add-obligations'
  | 'try-simulator'
  | 'ask-ai'
  | 'all-set';

export type NextStep = {
  id: NextStepId;
  title: string;
  body: string;
  icon: string;
  actionLabel: string;
  href: string;
};

const STEPS: Record<NextStepId, Omit<NextStep, 'id'>> = {
  'register-income': {
    title: 'Registra tu ingreso mensual',
    body: 'Con eso AlcancIA puede dividir tu dinero y decirte cuánto es seguro gastar.',
    icon: 'banknote',
    actionLabel: 'Registrar ingreso',
    href: '/movimiento/nuevo',
  },
  'record-spending': {
    title: 'Registra tus primeros gastos',
    body: 'Anota lo que gastaste hoy o esta semana. Mientras más real, mejores consejos.',
    icon: 'plus',
    actionLabel: 'Registrar gasto',
    href: '/movimiento/nuevo',
  },
  'create-goal': {
    title: 'Crea tu primera meta',
    body: 'Un fondo de emergencia, un viaje, tu inicial… ponerle nombre hace que avance.',
    icon: 'target',
    actionLabel: 'Crear meta',
    href: '/meta/nueva',
  },
  'review-debt': {
    title: 'Tu deuda vence pronto',
    body: 'Mírala con calma y decide cuánto pagar: cada sol extra ahorra intereses.',
    icon: 'calendar-clock',
    actionLabel: 'Ver mi deuda',
    href: '/deudas',
  },
  'add-obligations': {
    title: 'Agrega tus pagos fijos',
    body: 'Alquiler, luz, internet… Así reservamos ese dinero antes de calcular lo libre.',
    icon: 'receipt',
    actionLabel: 'Ver suscripciones y deudas',
    href: '/suscripciones',
  },
  'try-simulator': {
    title: 'Prueba "¿Puedo comprarlo?"',
    body: 'Antes de tu próxima compra, mira su impacto real en tu mes. Toma 10 segundos.',
    icon: 'shield-check',
    actionLabel: 'Probar el simulador',
    href: '/puedo-comprarlo',
  },
  'ask-ai': {
    title: 'Pregúntale a AlcancIA',
    body: '"¿Cómo voy este mes?", "¿puedo pagar esta cuota?"… Responde con tus números reales.',
    icon: 'sparkles',
    actionLabel: 'Abrir AlcancIA',
    href: '/(tabs)/ia',
  },
  'all-set': {
    title: 'Todo en orden por aquí',
    body: 'Sigue registrando tus movimientos y AlcancIA te avisará si algo necesita atención.',
    icon: 'check-circle',
    actionLabel: 'Ver mis movimientos',
    href: '/(tabs)/movimientos',
  },
};

const step = (id: NextStepId): NextStep => ({ id, ...STEPS[id] });

export function computeNextStep(
  snapshot: FinancialSnapshot,
  opts: { askedAi?: boolean; usedSimulator?: boolean } = {},
  now: Date = new Date(),
): NextStep {
  const hasIncome = snapshot.income.length > 0
    || snapshot.transactions.some((t) => t.kind === 'income');
  if (!hasIncome) return step('register-income');

  const expenses = snapshot.transactions.filter((t) => t.kind === 'expense' && !t.operation);
  if (expenses.length < 3) return step('record-spending');

  if (snapshot.goals.length === 0) return step('create-goal');

  // Time-sensitive: a debt minimum due within the next 5 days.
  const urgentDebt = snapshot.debts.some((d) => {
    const days = daysBetween(now, nextDayOfMonth(d.dueDay, now));
    return days >= 0 && days <= 5;
  });
  if (urgentDebt) return step('review-debt');

  const hasObligations = snapshot.recurring.some((r) => r.essential)
    || snapshot.subscriptions.length > 0
    || snapshot.debts.length > 0;
  if (!hasObligations) return step('add-obligations');

  if (!opts.usedSimulator) return step('try-simulator');
  if (!opts.askedAi) return step('ask-ai');

  return step('all-set');
}
