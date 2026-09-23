import type { FinancialSnapshot } from '@/types/domain';
import { daysBetween, parseISO, toISODate } from '@/utils/date';

export type MissionArtwork = 'growth' | 'focus' | 'community';

export type Mission = {
  id: string;
  title: string;
  subtitle: string;
  progress: number;
  target: number;
  progressLabel: string;
  reward: number;
  artwork: MissionArtwork;
  accent: 'mint' | 'violet' | 'sky';
};

const clamp = (value: number, target: number) => Math.max(0, Math.min(value, target));

export function buildMissions(snapshot: FinancialSnapshot, asOf: Date = new Date()): Mission[] {
  const today = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  const period = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const loggedDays = new Set(snapshot.transactions.map((transaction) => transaction.date));
  const recent = snapshot.transactions.filter((transaction) => {
    const distance = daysBetween(parseISO(transaction.date), today);
    return distance >= 0 && distance <= 7;
  });
  const deliveryDays = new Set(
    recent.filter((transaction) => transaction.category === 'delivery').map((transaction) => transaction.date),
  );
  const sevenDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(day.getDate() - index);
    return toISODate(day);
  });
  const intentionalDays = sevenDays.filter((day) => loggedDays.has(day) && !deliveryDays.has(day)).length;
  let streak = 0;
  let cursor = new Date(today);
  if (!loggedDays.has(toISODate(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (loggedDays.has(toISODate(cursor)) && streak < 21) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  const goalsWithProgress = snapshot.goals.filter((goal) => goal.saved.minor > 0).length;

  return [
    {
      id: `clarity-21-v2-${period}`,
      title: '21 días de claridad',
      subtitle: 'Registra un movimiento cada día',
      progress: clamp(streak, 21),
      target: 21,
      progressLabel: `Racha de ${clamp(streak, 21)} de 21 días`,
      reward: 80,
      artwork: 'growth',
      accent: 'mint',
    },
    {
      id: `intentional-7-v2-${period}`,
      title: '7 días con intención',
      subtitle: 'Una semana sin delivery',
      progress: clamp(intentionalDays, 7),
      target: 7,
      progressLabel: `${clamp(intentionalDays, 7)} de 7 días`,
      reward: 50,
      artwork: 'focus',
      accent: 'violet',
    },
    {
      id: `goals-5-v2-${period}`,
      title: 'Haz crecer tus planes',
      subtitle: 'Avanza en 5 metas de ahorro',
      progress: clamp(goalsWithProgress, 5),
      target: 5,
      progressLabel: `${clamp(goalsWithProgress, 5)} de 5 metas`,
      reward: 60,
      artwork: 'community',
      accent: 'sky',
    },
  ];
}
