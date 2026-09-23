import { Platform } from 'react-native';

/**
 * Social sign-in configuration. Client IDs come from the environment (never
 * hardcoded) — see mobile/.env.example:
 *   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID / _IOS_ / _WEB_
 *   EXPO_PUBLIC_FACEBOOK_APP_ID
 * These are public OAuth identifiers, not secrets. The resulting Google token is
 * verified by the AlcancIA server (never trusted from the app alone).
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
