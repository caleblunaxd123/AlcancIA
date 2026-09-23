import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, View } from 'react-native';

import { EmailCodeStep } from '@/components/auth/EmailCodeStep';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { PageHeader } from '@/components/common/PageHeader';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { requestEmailCode } from '@/services/emailVerification';
import { collectData, wipeLocalData } from '@/services/sync';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';

type DeleteFlow = { step: 'code'; challengeId: string; resendAfter: number } | null;

/** Right of access and cancellation (Ley 29733, store policies): export + delete. */
export default function PrivacyAndData() {
  const router = useRouter();
  const theme = useTheme();
  const account = useAuthStore((s) => s.account);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const [deleting, setDeleting] = useState<DeleteFlow>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isCloud = !!account?.serverId;

  const exportData = async () => {
    const payload = {
      exportadoEl: new Date().toISOString(),
      cuenta: account ? { nombre: account.name, correo: account.email, proveedor: account.provider ?? 'password' } : null,
      datos: collectData(),
    };
    try {
      await Share.share({ title: 'Mis datos de AlcancIA', message: JSON.stringify(payload, null, 2) });
    } catch {
      Alert.alert('No se pudo compartir', 'Inténtalo de nuevo.');
    }
  };

  const finishDeletion = async (ticket?: string) => {
    setBusy(true);
    const result = await deleteAccount(ticket);
    setBusy(false);
    if (!result.ok) {
      setDeleting(null);
      return setError(result.error);
    }
    wipeLocalData();
    router.replace('/welcome');
    Alert.alert('Cuenta eliminada', 'Borramos tu cuenta y tus datos. Gracias por haber usado AlcancIA.');
  };

  const startDeletion = () => {
    setError('');
    Alert.alert(
      '¿Eliminar tu cuenta?',
      isCloud
        ? 'Se borrarán para siempre tu cuenta, tu respaldo en la nube y los datos de este celular. Esta acción no se puede deshacer. Te enviaremos un código para confirmar.'
        : 'Se borrarán para siempre tu cuenta y tus datos de este celular. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: isCloud ? 'Enviarme el código' : 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!isCloud) return finishDeletion();
            setBusy(true);
            const sent = await requestEmailCode(account!.email, 'delete');
            setBusy(false);
            if (!sent.ok) return setError(sent.error);
            setDeleting({ step: 'code', challengeId: sent.challengeId, resendAfter: sent.resendAfterSeconds });
          },
        },
      ],
    );
  };

  return (
    <Screen keyboardAware edges={{ top: true }}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.xl, paddingBottom: theme.spacing.huge }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <PageHeader title="Privacidad y datos" subtitle="Tus datos son tuyos: descárgalos o elimínalos" onBack={() => router.back()} />

        {deleting ? (
          <Card>
            <Text variant="subtitle" style={{ marginBottom: theme.spacing.md }}>Confirma que quieres eliminar tu cuenta</Text>
            <EmailCodeStep
              email={account!.email}
              purpose="delete"
              challengeId={deleting.challengeId}
              resendAfterSeconds={deleting.resendAfter}
              onVerified={finishDeletion}
              onChangeEmail={() => setDeleting(null)}
            />
            <Button label="Cancelar" variant="ghost" fullWidth onPress={() => setDeleting(null)} />
          </Card>
        ) : (
          <>
            <Card>
              <View style={{ gap: theme.spacing.md }}>
                <Row icon="shield-check" title="Cómo protegemos tus datos" body="Cifrados en tu celular y en nuestro servidor. Los cálculos se hacen en tu celular; nunca vendemos tus datos." />
                <Button label="Descargar mis datos" icon="download" variant="secondary" fullWidth onPress={exportData} />
                <Text variant="caption" color="muted">Te damos una copia completa de tu cuenta y tus registros en formato JSON para guardar o compartir.</Text>
              </View>
            </Card>

            <Card>
              <View style={{ gap: theme.spacing.md }}>
                <LinkRow icon="file-text" label="Política de privacidad" onPress={() => router.push('/legal/privacidad' as Href)} />
                <LinkRow icon="scale" label="Términos de uso" onPress={() => router.push('/legal/terminos' as Href)} />
              </View>
            </Card>

            <Card>
              <View style={{ gap: theme.spacing.md }}>
                <Row icon="trash-2" title="Eliminar mi cuenta" body="Borra para siempre tu cuenta y tus datos, en este celular y en la nube." danger />
                {error ? <Text variant="caption" color="negative" accessibilityLiveRegion="polite">{error}</Text> : null}
                <Button label="Eliminar mi cuenta" variant="danger" fullWidth loading={busy} onPress={startDeletion} />
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Row({ icon, title, body, danger }: { icon: string; title: string; body: string; danger?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
      <Icon name={icon} size={20} color={danger ? 'negative' : 'brand'} />
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" color="secondary">{body}</Text>
      </View>
    </View>
  );
}

function LinkRow({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: 44 }}>
      <Icon name={icon} size={20} color="secondary" />
      <Text variant="body" style={{ flex: 1 }}>{label}</Text>
      <Icon name="chevron-right" size={18} color="muted" />
    </Pressable>
  );
}
