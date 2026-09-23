import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { useSocialSignIn } from '@/hooks/useSocialSignIn';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';
import { passwordStrength, validateEmail, validatePassword } from '@/utils/authValidation';

export default function Register() {
  const router = useRouter();
  const theme = useTheme();
  const register = useAuthStore((state) => state.register);
  const resetOnboarding = useAppStore((state) => state.resetOnboarding);
  const resetData = useFinancialStore((state) => state.reset);
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [recovery, setRecovery] = useState(''); const [visible, setVisible] = useState(false);
  const [accepted, setAccepted] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const social = useSocialSignIn();
  const strength = passwordStrength(password);
  const canSubmit = useMemo(() => name.trim().length >= 2 && !validateEmail(email) && !validatePassword(password) && password === confirm && recovery.trim().length >= 2 && accepted, [name, email, password, confirm, recovery, accepted]);

  const submit = async () => {
    if (!canSubmit) return setError(password !== confirm ? 'Las contraseñas no coinciden.' : 'Revisa los campos y acepta el aviso de privacidad.');
    setLoading(true); setError('');
    const result = await register({ name, email, password, recoveryAnswer: recovery });
    setLoading(false);
    if (!result.ok) return setError(result.error);
    resetData(); resetOnboarding();
    router.replace('/onboarding');
  };

  return (
    <AuthShell compact eyebrow="Cuenta gratuita" title="Crea tu cuenta" subtitle="Regístrate en menos de un minuto. Sin costo y sin anuncios.">
      <View style={{ gap: theme.spacing.lg }}>
        <SocialAuthButtons onProfile={social.onProfile} onError={social.onError} dividerFirst={false} dividerLabel="o regístrate con tu correo" />
        {social.error ? <Text variant="caption" color="negative" center accessibilityLiveRegion="polite">{social.error}</Text> : null}
        <TextField label="Nombre" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" placeholder="¿Cómo te llamas?" />
        <TextField label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="tu@correo.com" />
        <View>
          <TextField label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry={!visible} autoCapitalize="none" autoComplete="new-password" placeholder="8+ caracteres" helperText="Mayúscula, minúscula y número" />
          <Pressable onPress={() => setVisible((value) => !value)} accessibilityRole="button" accessibilityLabel="Mostrar u ocultar contraseña" style={{ position: 'absolute', right: 8, top: 29, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name={visible ? 'eye-off' : 'eye'} size={20} color="muted" /></Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>{[1, 2, 3].map((level) => <View key={level} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: strength >= level ? theme.colors.brand.primary : theme.colors.border.strong }} />)}</View>
        <TextField label="Confirmar contraseña" value={confirm} onChangeText={setConfirm} secureTextEntry={!visible} autoCapitalize="none" autoComplete="new-password" error={confirm && confirm !== password ? 'Las contraseñas no coinciden.' : undefined} />
        <TextField label="Recuperación: nombre de tu primera mascota" value={recovery} onChangeText={setRecovery} autoCapitalize="words" helperText="Solo se guarda una huella cifrada de tu respuesta." />
        <Pressable onPress={() => setAccepted((value) => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: accepted }} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md, minHeight: 44 }}>
          <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: accepted ? theme.colors.brand.primary : theme.colors.border.strong, backgroundColor: accepted ? theme.colors.brand.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{accepted ? <Icon name="check" size={16} color="onBrand" /> : null}</View>
          <Text variant="caption" color="secondary" style={{ flex: 1 }}>Entiendo que esta versión guarda mi cuenta y datos financieros de forma segura en este dispositivo.</Text>
        </Pressable>
        {error ? <Text variant="caption" color="negative" accessibilityLiveRegion="polite">{error}</Text> : null}
        <Button label="Crear cuenta" size="lg" fullWidth disabled={!canSubmit} loading={loading} onPress={submit} />
        <Pressable onPress={() => router.replace('/auth/login')} accessibilityRole="button"><Text variant="body" color="secondary" center>¿Ya tienes cuenta? <Text variant="bodyStrong" color="brand">Inicia sesión</Text></Text></Pressable>
      </View>
    </AuthShell>
  );
}
