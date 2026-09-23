import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { EmailCodeStep } from '@/components/auth/EmailCodeStep';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { useSocialSignIn } from '@/hooks/useSocialSignIn';
import { requestEmailCode } from '@/services/emailVerification';
import { onSignedIn } from '@/services/sync';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';

type Activation = { step: 'offer' } | { step: 'code'; challengeId: string; resendAfter: number };

export default function Login() {
  const router = useRouter();
  const theme = useTheme();
  const account = useAuthStore((state) => state.account);
  const login = useAuthStore((state) => state.login);
  const activateInCloud = useAuthStore((state) => state.activateInCloud);
  const [email, setEmail] = useState(account?.email ?? '');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // An account created on this phone before the cloud existed: offer to activate it.
  const [activation, setActivation] = useState<Activation | null>(null);
  const social = useSocialSignIn();

  const enter = async (keepLocalData = false) => {
    const userId = useAuthStore.getState().account?.serverId;
    if (userId) await onSignedIn(userId, { keepLocalData });
    router.replace(useAppStore.getState().onboarded ? '/(tabs)' : '/onboarding');
  };

  const submit = async () => {
    if (loading) return;
    Keyboard.dismiss();
    setLoading(true); setError('');
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) return enter();
    if ('needsActivation' in result) return setActivation({ step: 'offer' });
    setError(result.error);
  };

  const sendActivationCode = async () => {
    setLoading(true); setError('');
    const sent = await requestEmailCode(email, 'register');
    setLoading(false);
    if (!sent.ok) return setError(sent.error);
    setActivation({ step: 'code', challengeId: sent.challengeId, resendAfter: sent.resendAfterSeconds });
  };

  const activate = async (ticket: string) => {
    const result = await activateInCloud({ password, ticket });
    if (!result.ok) { setActivation({ step: 'offer' }); return setError(result.error); }
    await enter(true); // keep this phone's data and upload it
  };

  if (activation?.step === 'code') {
    return (
      <AuthShell compact eyebrow="Activa tu cuenta" title="Revisa tu correo" subtitle="Escribe el código para pasar tu cuenta a la nube. Tus datos se mantienen.">
        <EmailCodeStep
          email={email.trim().toLowerCase()}
          purpose="register"
          challengeId={activation.challengeId}
          resendAfterSeconds={activation.resendAfter}
          onVerified={activate}
          onChangeEmail={() => setActivation(null)}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell compact eyebrow="Acceso seguro" title="Ingresa a tu cuenta" subtitle="Entra con el método que elegiste al crear tu cuenta.">
      <View style={{ gap: theme.spacing.lg }}>
        {activation?.step === 'offer' ? (
          <Card variant="insight">
            <View style={{ gap: theme.spacing.md }}>
              <Text variant="subtitle">Activa tu cuenta en la nube</Text>
              <Text variant="body" color="secondary">
                Tu cuenta vive solo en este celular. Actívala para respaldar tus datos, protegerla con verificación por correo y usarla en otros dispositivos. No perderás nada.
              </Text>
              {error ? <Text variant="caption" color="negative" accessibilityLiveRegion="polite">{error}</Text> : null}
              <Button label="Enviarme un código" icon="mail" fullWidth loading={loading} onPress={sendActivationCode} />
              <Button label="Ahora no" variant="ghost" fullWidth onPress={() => { setActivation(null); setError(''); }} />
            </View>
          </Card>
        ) : null}
        <TextField label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="tu@correo.com" />
        <View>
          <TextField label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry={!visible} autoCapitalize="none" autoComplete="current-password" placeholder="Tu contraseña" error={!activation && error ? error : undefined} onSubmitEditing={submit} />
          <Pressable onPress={() => setVisible((value) => !value)} accessibilityRole="button" accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} style={{ position: 'absolute', right: 8, top: 29, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name={visible ? 'eye-off' : 'eye'} size={20} color="muted" /></Pressable>
        </View>
        <Pressable onPress={() => router.push('/auth/forgot-password')} accessibilityRole="button" style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' }}><Text variant="bodyStrong" color="brand">Olvidé mi contraseña</Text></Pressable>
        <Button label="Iniciar sesión" size="lg" fullWidth loading={loading && !activation} onPress={submit} />
        <SocialAuthButtons onGoogleToken={social.onGoogleToken} onError={social.onError} />
        {social.error ? <Text variant="caption" color="negative" center accessibilityLiveRegion="polite">{social.error}</Text> : null}
        <Pressable onPress={() => router.replace('/auth/register')} accessibilityRole="button"><Text variant="body" color="secondary" center>¿Aún no tienes cuenta? <Text variant="bodyStrong" color="brand">Regístrate</Text></Text></Pressable>
      </View>
    </AuthShell>
  );
}
