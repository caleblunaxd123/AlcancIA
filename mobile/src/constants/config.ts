import { Platform } from 'react-native';

/** Unroutable on purpose: a release build without a valid HTTPS URL fails closed. */
export const MISCONFIGURED_API_URL = 'https://api-no-configurada.invalid';

/**
 * Backend base URL.
 * - Development: EXPO_PUBLIC_API_URL, or the local backend through
 *   `adb reverse tcp:5080 tcp:5080` (Android) / host loopback (iOS simulator).
 * - Release builds: EXPO_PUBLIC_API_URL is REQUIRED and must be https://.
 *   Anything else resolves to an unroutable host, so credentials and financial
 *   data are never sent over plain HTTP by a misconfigured build.
 */
export function resolveApiBaseUrl(fromEnv: string | undefined, isDev: boolean, os: string): string {
  const url = fromEnv?.trim().replace(/\/+$/, '') ?? '';
  if (!isDev) return /^https:\/\/[^/\s]+/i.test(url) ? url : MISCONFIGURED_API_URL;
  if (url.length > 0) return url;
  return os === 'android' ? 'http://127.0.0.1:5080' : 'http://localhost:5080';
}

export const API_BASE_URL = resolveApiBaseUrl(
  process.env.EXPO_PUBLIC_API_URL,
  typeof __DEV__ === 'undefined' ? true : __DEV__,
  Platform.OS,
);
export const AI_REQUEST_TIMEOUT_MS = 12000;
