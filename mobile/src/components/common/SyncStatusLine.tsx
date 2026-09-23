import { Pressable, View } from 'react-native';

import { Icon } from './Icon';
import { Text } from './Text';
import { syncNow } from '@/services/sync';
import { isLegacyAccount, useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';
import { useTheme } from '@/theme';

function ago(iso: string | null): string {
  if (!iso) return '';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `hace ${hours} h` : `hace ${Math.round(hours / 24)} d`;
}

/** "Respaldado en la nube · hace 2 min" — tap to sync now. */
export function SyncStatusLine() {
  const theme = useTheme();
  const account = useAuthStore((s) => s.account);
  const { status, dirty, lastSyncedAt } = useSyncStore();

  if (isLegacyAccount(account)) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
        <Icon name="smartphone" size={14} color="warning" />
        <Text variant="caption" color="secondary">Solo en este celular · actívala en la nube al iniciar sesión</Text>
      </View>
    );
  }
  if (!account?.serverId) return null;

  const [icon, color, label] =
    status === 'syncing' ? ['refresh-cw', 'muted', 'Sincronizando…'] as const
    : status === 'offline' ? ['cloud-off', 'warning', dirty ? 'Sin conexión · tus cambios se subirán al volver' : 'Sin conexión'] as const
    : status === 'error' ? ['cloud-alert', 'negative', 'No pudimos sincronizar · toca para reintentar'] as const
    : dirty ? ['cloud-upload', 'muted', 'Cambios por subir'] as const
    : ['cloud-check', 'brand', `Respaldado en la nube${lastSyncedAt ? ` · ${ago(lastSyncedAt)}` : ''}`] as const;

  return (
    <Pressable
      onPress={() => void syncNow()}
      accessibilityRole="button"
      accessibilityLabel={`${label}. Toca para sincronizar ahora`}
      hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minHeight: 32 }}
    >
      <Icon name={icon} size={14} color={color} />
      <Text variant="caption" color={color === 'brand' ? 'brand' : 'secondary'}>{label}</Text>
    </Pressable>
  );
}
