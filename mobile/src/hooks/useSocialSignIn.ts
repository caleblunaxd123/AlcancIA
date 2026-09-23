import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { useAppStore } from '@/store/appStore';
import { useAuthStore, type SocialProfile } from '@/store/authStore';
import { useFinancialStore } from '@/store/financialStore';
import { useSharedStore } from '@/store/sharedStore';

/**
 * Turns a Google/Facebook profile into a signed-in session. A brand-new account
 * starts clean (same as email sign-up) and goes through onboarding; a returning
 * one lands on Home. Callbacks are stable so provider effects don't re-run.
 */
export function useSocialSignIn() {
  const router = useRouter();
  const [error, setError] = useState('');

  const onProfile = useCallback(
    (profile: SocialProfile) => {
      const auth = useAuthStore.getState();
      const isNewAccount = auth.account == null;
      const result = auth.socialSignIn(profile);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError('');
      if (isNewAccount) {
        useFinancialStore.getState().reset();
        useSharedStore.getState().reset();
        useAppStore.getState().resetOnboarding();
      }
      router.replace(useAppStore.getState().onboarded ? '/(tabs)' : '/onboarding');
    },
    [router],
  );

  const onError = useCallback((message: string) => setError(message), []);

  return { onProfile, onError, error, clearError: () => setError('') };
}
