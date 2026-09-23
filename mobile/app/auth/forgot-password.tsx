import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { EmailCodeStep } from '@/components/auth/EmailCodeStep';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Text } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { requestEmailCode } from '@/services/emailVerification';
import { isLegacyAccount, useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';
import { normalizeEmail, validateEmail } from '@/utils/authValidation';

type Step = 'email' | 'code' | 'password' | 'word' | 'done';

const SUBTITLES: Record<Step, string> = {
  email: 'Te enviaremos un código a tu correo para confirmar que eres tú.',
  code: 'Escribe el código que te enviamos.',
  password: 'Correo verificado. Elige tu nueva contraseña: cerraremos tu sesión en todos tus dispositivos.',
  word: 'Usa la palabra de recuperación que elegiste al registrarte.',
  done: 'Ya puedes volver a entrar con tu nueva contraseña.',
};

export default function ForgotPassword() {
  const router = useRouter();
  const theme = useTheme();
  const resetWithCode = useAuthStore((state) => state.resetPassword);
  const resetWithWord = useAuthStore((state) => state.resetPasswordWithWord);
  // The recovery word only exists for accounts created on this device before the cloud.
  const hasLegacyAccount = useAuthStore((state) => isLegacyAccount(state.account));
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [answer, setAnswer] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [challenge, setChallenge] = useState<{ id: string; resendAfter: number } | null>(null);
  const [ticket, setTicket] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    const emailError = validateEmail(email);
    if (emailError) return setError(emailError);
    setLoading(true); setError('');
    const sent = await requestEmailCode(email, 'recover');
    setLoading(false);
    if (!sent.ok) return setError(sent.error);
    setChallenge({ id: sent.challengeId, resendAfter: sent.resendAfterSeconds });
    setStep('code');
  };

  const savePassword = async () => {
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    setLoading(true); setError('');
    const result = step === 'word'
      ? await resetWithWord({ email, recoveryAnswer: answer, password })
      : await resetWithCode({ email, password, ticket });
    setLoading(false);
    if (!result.ok) return setError(result.error);
    setStep('done');
  };

  const passwordFields = (
    <>
      <TextField label="Nueva contraseña" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" helperText="8+ caracteres, mayúscula, minúscula y número" />
      <TextField label="Confirma la nueva contraseña" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" autoComplete="new-password" error={error || undefined} />
      <Button label="Actualizar contraseña" size="lg" fullWidth loading={loading} onPress={savePassword} />
    </>
  );

  return (
    <AuthShell compact eyebrow="Recuperación segura" title={step === 'done' ? 'Contraseña actualizada' : 'Recupera tu acceso'} subtitle={SUBTITLES[step]}>
      {step === 'done' ? (
        <Card variant="insight">
          <Text variant="body" center>Tu sesión permanece cerrada por seguridad.</Text>
          <View style={{ marginTop: theme.spacing.lg }}>
            <Button label="Volver a iniciar sesión" fullWidth onPress={() => router.replace('/auth/login')} />
          </View>
        </Card>
      ) : step === 'code' && challenge ? (
        <EmailCodeStep
          email={normalizeEmail(email)}
          purpose="recover"
          challengeId={challenge.id}
          resendAfterSeconds={challenge.resendAfter}
          onVerified={(verified) => { setTicket(verified); setError(''); setStep('password'); }}
          onChangeEmail={() => setStep('email')}
        />
      ) : (
        <View style={{ gap: theme.spacing.lg }}>
          {step === 'email' || step === 'word' ? (
            <TextField label="Correo electrónico" value={email} onChangeText={(v) => { setEmail(v); setError(''); }} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="tu@correo.com" error={step === 'email' ? error || undefined : undefined} />
          ) : null}
          {step === 'email' ? (
            <>
              <Button label="Enviarme un código" size="lg" fullWidth loading={loading} onPress={sendCode} />
              {hasLegacyAccount ? (
                <Pressable onPress={() => { setError(''); setStep('word'); }} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Text variant="body" color="secondary" center>¿No tienes acceso a tu correo? <Text variant="bodyStrong" color="brand">Usa tu palabra de recuperación</Text></Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
          {step === 'word' ? (
            <>
              <TextField label="Palabra de recuperación" value={answer} onChangeText={setAnswer} autoCapitalize="none" autoCorrect={false} helperText="La palabra que elegiste al registrarte. Si creaste tu cuenta antes, usa el nombre de tu primera mascota." />
              {passwordFields}
              <Pressable onPress={() => { setError(''); setStep('email'); }} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text variant="bodyStrong" color="brand" center>Mejor recibir un código por correo</Text>
              </Pressable>
            </>
          ) : null}
          {step === 'password' ? passwordFields : null}
          <Button label="Volver" variant="ghost" fullWidth onPress={() => router.back()} />
        </View>
      )}
    </AuthShell>
  );
}
