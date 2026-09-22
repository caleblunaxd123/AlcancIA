/**
 * Lightweight, deterministic insight generation (§20). The AI layer can later
 * rephrase these, but the facts always come from code. Copy is warm and never
 * shaming (§43).
 */
import { formatMoney, money, sum } from './money';
import type { FinancialSnapshot, Transaction } from '@/types/domain';
import { parseISO, daysBetween } from '@/utils/date';

export type Insight = {
  id: string;
  title: string;
  body: string;
  icon: string;
  tone: 'positive' | 'attention';
};

function spendInWindow(txs: Transaction[], category: string, fromDaysAgo: number, toDaysAgo: number) {
  const now = new Date();
  const matched = txs.filter((t) => {
    if (t.kind !== 'expense' || t.category !== category) return false;
    const age = daysBetween(parseISO(t.date), now);
    return age >= toDaysAgo && age <= fromDaysAgo;
  });
  return sum(matched.map((t) => t.amount));
}

export function generateInsights(snapshot: FinancialSnapshot): Insight[] {
  const insights: Insight[] = [];
  const txs = snapshot.transactions;

  // Delivery week-over-week.
  const deliveryThisWeek = spendInWindow(txs, 'delivery', 6, 0);
  const deliveryLastWeek = spendInWindow(txs, 'delivery', 13, 7);
  if (deliveryLastWeek.minor > 0 && deliveryThisWeek.minor < deliveryLastWeek.minor) {
    const saved = money(deliveryLastWeek.minor - deliveryThisWeek.minor);
    insights.push({
      id: 'delivery-down',
      title: 'AlcancIA detectó algo',
      body: `Gastaste ${formatMoney(saved)} menos en delivery esta semana. Ese ritmo acerca tus metas un poco más.`,
      icon: 'sparkles',
      tone: 'positive',
    });
  } else if (deliveryThisWeek.minor > deliveryLastWeek.minor && deliveryLastWeek.minor > 0) {
    const extra = money(deliveryThisWeek.minor - deliveryLastWeek.minor);
    insights.push({
      id: 'delivery-up',
      title: 'Delivery subió un poco',
      body: `Delivery está ${formatMoney(extra)} sobre tu ritmo habitual. Reduciendo un par de pedidos podrías volver a tu promedio.`,
      icon: 'bike',
      tone: 'attention',
    });
  }

  // Emergency fund milestone.
  const emergency = snapshot.goals.find((g) => g.kind === 'emergency');
  if (emergency) {
    const monthlyEssentials = snapshot.recurring
      .filter((r) => r.essential)
      .reduce((acc, r) => acc + r.amount.minor, 0);
    if (emergency.saved.minor >= monthlyEssentials && monthlyEssentials > 0) {
      insights.push({
        id: 'emergency-milestone',
        title: 'Buen progreso',
        body: 'Tu fondo de emergencia ya supera un mes de gastos esenciales. Es un colchón real.',
        icon: 'shield-check',
        tone: 'positive',
      });
    }
  }

  return insights.slice(0, 2);
}
