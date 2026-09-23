import { Platform } from 'react-native';

import type { SocialProfile } from '@/store/authStore';

/**
 * Social sign-in configuration. Client IDs come from the environment (never
 * hardcoded) — see mobile/.env.example:
 *   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID / _IOS_ / _WEB_
 *   EXPO_PUBLIC_FACEBOOK_APP_ID
 * These are public OAuth identifiers, not secrets.
 */
export const socialConfig = {
  google: {
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  },
  facebookAppId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '',
};

/** The Google hook throws if the current platform's client id is missing. */
export function isGoogleConfigured(): boolean {
  const g = socialConfig.google;
  if (Platform.OS === 'android') return g.androidClientId.length > 0;
  if (Platform.OS === 'ios') return g.iosClientId.length > 0;
  return g.webClientId.length > 0;
}

export function isFacebookConfigured(): boolean {
  return socialConfig.facebookAppId.length > 0;
}

const TIMEOUT_MS = 12000;

async function getJson(url: string, accessToken?: string): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Reads the minimal profile (id, name, email) with the OAuth access token. */
export async function fetchGoogleProfile(accessToken: string): Promise<SocialProfile> {
  const data = await getJson('https://www.googleapis.com/oauth2/v3/userinfo', accessToken);
  return { provider: 'google', providerUserId: str(data.sub), name: str(data.given_name) || str(data.name), email: str(data.email) || undefined };
}

export async function fetchFacebookProfile(accessToken: string): Promise<SocialProfile> {
  // Graph API: token as bearer header, only the fields we need.
  const data = await getJson('https://graph.facebook.com/me?fields=id,first_name,name,email', accessToken);
  return { provider: 'facebook', providerUserId: str(data.id), name: str(data.first_name) || str(data.name), email: str(data.email) || undefined };
}
