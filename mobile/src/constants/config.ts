import { Platform } from 'react-native';

/**
 * Backend base URL. In local dev the Android emulator reaches the host via
 * `adb reverse tcp:5080 tcp:5080` (so 127.0.0.1 works), and the iOS simulator
 * shares the host loopback. Override with EXPO_PUBLIC_API_URL for real devices
 * or deployed environments.
 */
function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  // Android emulator: 10.0.2.2 is the host loopback; with adb reverse, 127.0.0.1
  // also works. We use 127.0.0.1 to match the reverse-tunnel setup.
  return Platform.OS === 'android' ? 'http://127.0.0.1:5080' : 'http://localhost:5080';
}

export const API_BASE_URL = resolveApiBaseUrl();
export const AI_REQUEST_TIMEOUT_MS = 12000;
