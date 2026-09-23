import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Text } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';

export default function ForgotPassword() {
  const router = useRouter(); const theme = useTheme();
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const [email, setEmail] = useState(''); const [answer, setAnswer] = useState(''); const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState(''); const [error, setError] = useState(''); const [done, setDone] = useState(false); const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    setLoading(true); setError('');
    const result = await resetPassword({ email, recoveryAnswer: answer, password });
    setLoading(false); if (!result.ok) return setError(result.error); setDone(true);
  };
  return <AuthShell compact eyebrow="Recuperación segura" title={done ? 'Contraseña actualizada' : 'Recupera tu acceso'} subtitle={done ? 'Ya puedes volver a entrar con tu nueva contraseña.' : 'Verifica tu cuenta con la respuesta que elegiste al registrarte.'}>
    {done ? <Card variant="insight"><Text variant="body" center>Tu sesión permanece cerrada por seguridad.</Text><View style={{ marginTop: theme.spacing.lg }}><Button label="Volver a iniciar sesión" fullWidth onPress={() => router.replace('/auth/login')} /></View></Card> : <View style={{ gap: theme.spacing.lg }}>
      <TextField label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextField label="¿Cuál fue el nombre de tu primera mascota?" value={answer} onChangeText={setAnswer} autoCapitalize="words" />
      <TextField label="Nueva contraseña" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" helperText="8+ caracteres, mayúscula, minúscula y número" />
      <TextField label="Confirma la nueva contraseña" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" error={error || undefined} />
      <Button label="Actualizar contraseña" size="lg" fullWidth loading={loading} onPress={submit} />
      <Button label="Volver" variant="ghost" fullWidth onPress={() => router.back()} />
    </View>}
  </AuthShell>;
}
