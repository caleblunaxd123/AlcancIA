import { API_BASE_URL } from '@/constants/config';

/**
 * One-time email codes (backend `/api/email/*`). Proves the user controls the
 * address; the returned ticket lets the server create the account or reset it. The
 * code itself is never stored or logged on the device.
 */
export type EmailCodePurpose = 'register' | 'recover' | 'delete';

export type RequestCodeResult =
  | { ok: true; challengeId: string; resendAfterSeconds: number }
  | { ok: false; error: string };

/** `ticket` is the server's proof of the verified code, required to register or reset. */
export type VerifyCodeResult = { ok: true; ticket: string } | { ok: false; error: string };

const TIMEOUT_MS = 15000;
const OFFLINE_ERROR = 'No pudimos conectar con AlcancIA para enviar el código. Revisa tu conexión e inténtalo de nuevo.';

async function post(path: string, body: unknown): Promise<{ status: number; data: Record<string, unknown> }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: response.status, data };
  } finally {
    clearTimeout(timer);
  }
}

const serverError = (data: Record<string, unknown>, fallback: string) =>
  typeof data.error === 'string' && data.error.length > 0 ? data.error : fallback;

export async function requestEmailCode(email: string, purpose: EmailCodePurpose): Promise<RequestCodeResult> {
  try {
    const { status, data } = await post('/api/email/request', { email: email.trim().toLowerCase(), purpose });
    if (status === 200 && typeof data.challengeId === 'string') {
      const resend = typeof data.resendAfterSeconds === 'number' ? data.resendAfterSeconds : 60;
      return { ok: true, challengeId: data.challengeId, resendAfterSeconds: resend };
    }
    if (status === 429) return { ok: false, error: serverError(data, 'Espera un minuto antes de pedir otro código.') };
    return { ok: false, error: serverError(data, 'No pudimos enviar el código. Inténtalo en un minuto.') };
  } catch {
    return { ok: false, error: OFFLINE_ERROR };
  }
}

export async function verifyEmailCode(input: {
  challengeId: string;
  email: string;
  purpose: EmailCodePurpose;
  code: string;
}): Promise<VerifyCodeResult> {
  const code = input.code.replace(/\D/g, '');
  if (code.length !== 6) return { ok: false, error: 'El código tiene 6 números.' };
  try {
    const { status, data } = await post('/api/email/verify', {
      challengeId: input.challengeId,
      email: input.email.trim().toLowerCase(),
      purpose: input.purpose,
      code,
    });
    if (status === 200 && data.verified === true && typeof data.ticket === 'string') return { ok: true, ticket: data.ticket };
    if (status === 429) return { ok: false, error: 'Demasiados intentos. Espera unos minutos.' };
    return { ok: false, error: serverError(data, 'El código no es válido o venció. Pide uno nuevo.') };
  } catch {
    return { ok: false, error: OFFLINE_ERROR };
  }
}
