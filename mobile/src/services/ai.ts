import { API_BASE_URL, AI_REQUEST_TIMEOUT_MS } from '@/constants/config';
import { calculateSafeToSpend } from '@/engine/safeToSpend';
import { projectGoal } from '@/engine/goals';
import { toMajor } from '@/engine/money';
import { CATEGORIES } from '@/constants/categories';
import type { FinancialSnapshot } from '@/types/domain';
import { nextDayOfMonth, daysBetween } from '@/utils/date';

export type AiImpactLevel = 'low' | 'medium' | 'high';

export type AiAnswer = {
  summary: string;
  impactLevel: AiImpactLevel;
  facts: string[];
  recommendations: string[];
  calculationIds: string[];
  source: string;
};

export type ChatResult = {
  answer: AiAnswer;
  usedFallback: boolean;
};

/**
 * Build the minimal, already-computed context the backend expects. All figures
 * come from the deterministic engine on-device — the server (and any model) only
 * ever explains them (§38/§43).
 */
export function buildChatContext(snapshot: FinancialSnapshot) {
  const sts = calculateSafeToSpend(snapshot);
  const currency = snapshot.currentBalance.currency;

  const monthlyIncome = snapshot.income.reduce((acc, i) => {
    const perMonth =
      i.frequency === 'weekly'
        ? i.amount.minor * 4.33
        : i.frequency === 'biweekly'
          ? i.amount.minor * 2
          : i.frequency === 'yearly'
            ? i.amount.minor / 12
            : i.amount.minor;
    return acc + perMonth;
  }, 0);

  const upcomingBills = [
    ...snapshot.debts.map((d) => ({ label: d.name, amount: d.minimumPayment, day: d.dueDay })),
    ...snapshot.subscriptions.map((s) => ({ label: s.name, amount: s.amount, day: s.renewalDay })),
  ]
    .map((b) => ({ label: b.label, amount: toMajor(b.amount), inDays: daysBetween(new Date(), nextDayOfMonth(b.day)) }))
    .sort((a, b) => a.inDays - b.inDays)
    .slice(0, 5);

  const categoryTotals = new Map<string, number>();
  for (const t of snapshot.transactions) {
    if (t.kind !== 'expense') continue;
    categoryTotals.set(t.category, (categoryTotals.get(t.category) ?? 0) + t.amount.minor);
  }
  const categorySummary = [...categoryTotals.entries()]
    .map(([id, minor]) => ({
      category: CATEGORIES[id as keyof typeof CATEGORIES]?.label ?? id,
      amount: toMajor({ minor, currency }),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  const goals = snapshot.goals.map((g) => ({
    name: g.name,
    saved: toMajor(g.saved),
    target: toMajor(g.target),
    percent: Math.round(projectGoal(g).progress * 100),
  }));

  return {
    currency,
    safeToSpend: toMajor(sts.amount),
    monthlyIncome: Math.round(toMajor({ minor: Math.round(monthlyIncome), currency }) * 100) / 100,
    upcomingBills,
    goals,
    categorySummary,
  };
}

/**
 * Ask the backend. On any network/timeout failure we throw so the caller can use
 * its own on-device deterministic answer — chat must never hard-fail (§69).
 */
export async function askAlcancIA(
  question: string,
  snapshot: FinancialSnapshot,
): Promise<ChatResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, context: buildChatContext(snapshot) }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`AI backend responded ${res.status}`);
    }

    return (await res.json()) as ChatResult;
  } finally {
    clearTimeout(timeout);
  }
}
