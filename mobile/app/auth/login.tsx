import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { useSocialSignIn } from '@/hooks/useSocialSignIn';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/theme';

export default function Login() {
  const router = useRouter();
  const theme = useTheme();
  const account = useAuthStore((state) => state.account);
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState(account?.email ?? '');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const social = useSocialSignIn();

  const submit = async () => {
    if (loading) return;
    Keyboard.dismiss();
    setLoading(true); setError('');
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) return setError(result.error);
    router.replace(useAppStore.getState().onboarded ? '/(tabs)' : '/onboarding');
  };

  return (
    <AuthShell compact eyebrow="Acceso seguro" title="Ingresa a tu cuenta" subtitle="Entra con el método que elegiste al crear tu cuenta.">
      <View style={{ gap: theme.spacing.lg }}>
        <TextField label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="tu@correo.com" />
        <View>
          <TextField label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry={!visible} autoCapitalize="none" autoComplete="current-password" placeholder="Tu contraseña" error={error || undefined} onSubmitEditing={submit} />
          <Pressable onPress={() => setVisible((value) => !value)} accessibilityRole="button" accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} style={{ position: 'absolute', right: 8, top: 29, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name={visible ? 'eye-off' : 'eye'} size={20} color="muted" /></Pressable>
        </View>
        <Pressable onPress={() => router.push('/auth/forgot-password')} accessibilityRole="button" style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' }}><Text variant="bodyStrong" color="brand">Olvidé mi contraseña</Text></Pressable>
        <Button label="Iniciar sesión" size="lg" fullWidth loading={loading} onPress={submit} />
        <SocialAuthButtons onProfile={social.onProfile} onError={social.onError} />
        {social.error ? <Text variant="caption" color="negative" center accessibilityLiveRegion="polite">{social.error}</Text> : null}
        {!account ? <Pressable onPress={() => router.replace('/auth/register')} accessibilityRole="button"><Text variant="body" color="secondary" center>¿Aún no tienes cuenta? <Text variant="bodyStrong" color="brand">Regístrate</Text></Text></Pressable> : null}
      </View>
    </AuthShell>
  );
}
