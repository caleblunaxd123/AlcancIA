import * as SecureStore from 'expo-secure-store';

import { API_BASE_URL } from '@/constants/config';

/**
 * HTTP client for the AlcancIA API.
 * - Access token: memory only (15 min). Refresh token: SecureStore, this device only.
 * - On 401 it refreshes once (single-flight: parallel requests share one refresh,
 *   so the rotating refresh token is never presented twice) and retries.
 * - Network failures surface as `offline`, distinct from server rejections.
 */

const REFRESH_KEY = 'alcancia-refresh-token';
const secureOptions: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const TIMEOUT_MS = 15000;

export type ServerUser = { id: string; name: string; email: string; provider: 'password' | 'google'; emailVerifiedAt: string | null };
export type ServerSession = { accessToken: string; expiresIn: number; refreshToken: string; user: ServerUser };

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; offline: boolean; error: string; data?: unknown };

let accessToken: string | null = null;
type RefreshOutcome = 'ok' | 'offline' | 'rejected';
let refreshing: Promise<RefreshOutcome> | null = null;
let onSessionLost: (() => void) | null = null;

/** Called when the refresh token is rejected (revoked, expired, reused elsewhere). */
export function setSessionLostHandler(handler: (() => void) | null) {
  onSessionLost = handler;
}

export async function saveSession(session: ServerSession): Promise<void> {
  accessToken = session.accessToken;
  await SecureStore.setItemAsync(REFRESH_KEY, session.refreshToken, secureOptions);
}

export async function clearSession(): Promise<void> {
  accessToken = null;
  await SecureStore.deleteItemAsync(REFRESH_KEY, secureOptions).catch(() => {});
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY, secureOptions).catch(() => null);
}

export async function hasSession(): Promise<boolean> {
  return (await getRefreshToken()) != null;
}

const OFFLINE = 'No pudimos conectar con AlcancIA. Revisa tu conexión.';

async function raw<T>(method: string, path: string, body?: unknown, auth = false): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data = response.status === 204 ? undefined : await response.json().catch(() => undefined);
    if (response.ok) return { ok: true, status: response.status, data: data as T };
    const message = data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string'
      ? (data as { error: string }).error
      : 'Algo salió mal. Inténtalo de nuevo.';
    return { ok: false, status: response.status, offline: false, error: message, data };
  } catch {
    return { ok: false, status: 0, offline: true, error: OFFLINE };
  } finally {
    clearTimeout(timer);
  }
}

/** Public endpoints (login, register, email codes). */
export function publicRequest<T>(method: string, path: string, body?: unknown) {
  return raw<T>(method, path, body, false);
}

async function refresh(): Promise<RefreshOutcome> {
  if (!refreshing) {
    refreshing = (async (): Promise<RefreshOutcome> => {
      const token = await getRefreshToken();
      if (!token) return 'rejected';
      const result = await raw<ServerSession>('POST', '/api/auth/refresh', { refreshToken: token });
      if (result.ok) {
        await saveSession(result.data);
        return 'ok';
      }
      if (result.offline) return 'offline';
      await clearSession();
      onSessionLost?.();
      return 'rejected';
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

/** Authenticated endpoints: adds the access token, refreshing it when needed. */
export async function authRequest<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  const expired = { ok: false as const, status: 401, offline: false, error: 'Tu sesión venció. Vuelve a iniciar sesión.' };
  if (!accessToken) {
    const outcome = await refresh();
    if (outcome === 'offline') return { ok: false, status: 0, offline: true, error: OFFLINE };
    if (outcome === 'rejected') return expired;
  }
  const first = await raw<T>(method, path, body, true);
  if (first.ok || first.status !== 401) return first;
  const outcome = await refresh();
  if (outcome === 'offline') return { ok: false, status: 0, offline: true, error: OFFLINE };
  if (outcome === 'rejected') return expired;
  return raw<T>(method, path, body, true);
}

/** Test hook: forget the in-memory access token. */
export function __resetApiClientForTests() {
  accessToken = null;
  refreshing = null;
  onSessionLost = null;
}
