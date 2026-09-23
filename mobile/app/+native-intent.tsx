/**
 * Filters OS deep links before Expo Router navigates.
 *
 * The Google/Facebook OAuth redirect (`<scheme>:/oauthredirect?code=…`) is
 * consumed by expo-auth-session's own listener; if the router also handled it,
 * it would push an "Unmatched Route" screen on top of the login.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  if (path.includes('oauthredirect') || path.includes('expo-auth-session')) {
    // Cold start from the redirect (app was killed): land on the entry point.
    return initial ? '/' : '';
  }
  return path;
}
