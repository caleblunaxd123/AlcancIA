import { Redirect } from 'expo-router';

import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';

/** Entry gate: send new users through onboarding, returning users to Home. */
export default function Index() {
  const onboarded = useAppStore((s) => s.onboarded);
  const account = useAuthStore((s) => s.account);
  const authenticated = useAuthStore((s) => s.authenticated);
  if (!account) return <Redirect href="/welcome" />;
  if (!authenticated) return <Redirect href="/auth/login" />;
  return <Redirect href={onboarded ? '/(tabs)' : '/onboarding'} />;
}
