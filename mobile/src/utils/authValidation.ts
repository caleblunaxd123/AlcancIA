export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export function validateEmail(value: string): string | null {
  const email = normalizeEmail(value);
  if (!email) return 'Escribe tu correo electrónico.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Ingresa un correo válido.';
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < 8) return 'Usa al menos 8 caracteres.';
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) {
    return 'Incluye una mayúscula, una minúscula y un número.';
  }
  return null;
}

export function passwordStrength(value: string): 0 | 1 | 2 | 3 {
  if (!value) return 0;
  let score = value.length >= 8 ? 1 : 0;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value)) score += 1;
  if (value.length >= 12 && /[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 3) as 0 | 1 | 2 | 3;
}
