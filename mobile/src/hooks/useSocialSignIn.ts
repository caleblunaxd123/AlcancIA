import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { onSignedIn } from '@/services/sync';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';

/**
 * Google sign-in: the server verifies the token and opens the session, then
 * this device loads that user's data (a different previous user never leaks
 * in). New accounts go through onboarding; returning ones land on Home.
 * Callbacks are stable so provider effects don't re-run.
 */
export function useSocialSignIn() {
  const router = useRouter();
  const [error, setError] = useState('');

  const onGoogleToken = useCallback(
    async (accessToken: string) => {
      const result = await useAuthStore.getState().googleSignIn(accessToken);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError('');
      const userId = useAuthStore.getState().account?.serverId;
      if (userId) await onSignedIn(userId);
      router.replace(useAppStore.getState().onboarded ? '/(tabs)' : '/onboarding');
    },
    [router],
  );

  const onError = useCallback((message: string) => setError(message), []);

  return { onGoogleToken, onError, error, clearError: () => setError('') };
}
