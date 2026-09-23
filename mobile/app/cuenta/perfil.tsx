import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { PageHeader } from '@/components/common/PageHeader';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';

export default function ProfileSettings() {
  const router = useRouter();
  const theme = useTheme();
  const account = useAuthStore((state) => state.account);
  const updateName = useAuthStore((state) => state.updateName);
  const changePassword = useAuthStore((state) => state.changePassword);
  const setAppName = useAppStore((state) => state.setName);
  const [name, setName] = useState(account?.name ?? '');
  const [profileError, setProfileError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const usesPassword = account?.provider !== 'google';

  const saveProfile = async () => {
    setProfileError('');
    setSavingProfile(true);
    const result = await updateName(name);
    setSavingProfile(false);
    if (!result.ok) return setProfileError(result.error);
    setAppName(name);
    Alert.alert('Perfil actualizado', 'Tus cambios ya se reflejan en AlcancIA.');
  };

  const savePassword = async () => {
    setPasswordError('');
    if (password !== confirm) return setPasswordError('Las contraseñas nuevas no coinciden.');
    setLoading(true);
    const result = await changePassword({ currentPassword, password });
    setLoading(false);
    if (!result.ok) return setPasswordError(result.error);
    setCurrentPassword(''); setPassword(''); setConfirm('');
    Alert.alert('Contraseña actualizada', 'Cerramos tu sesión en tus otros dispositivos por seguridad.');
  };

  return (
    <Screen keyboardAware edges={{ top: true }}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.xl, paddingBottom: theme.spacing.huge }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <PageHeader title="Mi perfil" subtitle={usesPassword ? 'Tu nombre, correo y contraseña' : 'Tu nombre y correo'} onBack={() => router.back()} />
        <Card>
          <Text variant="subtitle" style={{ marginBottom: theme.spacing.lg }}>Datos personales</Text>
          <View style={{ gap: theme.spacing.lg }}>
            <TextField label="Nombre" value={name} onChangeText={setName} autoCapitalize="words" error={profileError || undefined} />
            <View>
              <Text variant="label" color="secondary">Correo electrónico</Text>
              <Text variant="body" style={{ marginTop: theme.spacing.xs }}>{account?.email}</Text>
              <Text variant="caption" color="muted">{account?.emailVerifiedAt ? 'Verificado' : 'Sin verificar'}{account?.provider === 'google' ? ' · Cuenta de Google' : ''}</Text>
            </View>
            <Button label="Guardar perfil" variant="secondary" icon="save" fullWidth loading={savingProfile} onPress={saveProfile} />
          </View>
        </Card>
        {usesPassword ? <Card>
          <Text variant="subtitle">Cambiar contraseña</Text>
          <Text variant="caption" color="secondary" style={{ marginTop: theme.spacing.xs, marginBottom: theme.spacing.lg }}>Necesitamos tu contraseña actual antes de reemplazarla.</Text>
          <View style={{ gap: theme.spacing.lg }}>
            <TextField label="Contraseña actual" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCapitalize="none" />
            <TextField label="Nueva contraseña" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" helperText="8+ caracteres, mayúscula, minúscula y número" />
            <TextField label="Confirmar nueva contraseña" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" error={passwordError || undefined} />
            <Button label="Actualizar contraseña" icon="key-round" fullWidth loading={loading} onPress={savePassword} />
          </View>
        </Card> : null}
        <Text variant="caption" color="muted" center>Tu contraseña nunca se almacena en texto legible.</Text>
      </ScrollView>
    </Screen>
  );
}
