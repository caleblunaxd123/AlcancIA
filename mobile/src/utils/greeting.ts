const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * Uses the device's local time. Early morning (00:00–04:59) is still "night"
 * in Spanish — nobody says "buenos días" at 1 a.m.
 */
export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** "Buenos días, Caleb" — or just "Buenos días" when we don't know the name yet. */
export function personalGreeting(name: string | null | undefined, now: Date = new Date()): string {
  const first = (name ?? '').trim().split(/\s+/)[0] ?? '';
  return first ? `${greeting(now)}, ${first}` : greeting(now);
}

/** "Martes, 23 de septiembre" — the calm date line under the greeting. */
export function todayLabel(now: Date = new Date()): string {
  return `${WEEKDAYS[now.getDay()]}, ${now.getDate()} de ${MONTHS[now.getMonth()]}`;
}
