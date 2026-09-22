import { Redirect } from 'expo-router';

import { useAppStore } from '@/store/appStore';

/** Entry gate: send new users through onboarding, returning users to Home. */
export default function Index() {
  const onboarded = useAppStore((s) => s.onboarded);
  return <Redirect href={onboarded ? '/(tabs)' : '/onboarding'} />;
}
