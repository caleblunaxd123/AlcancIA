import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { Money } from '@/components/financial/Money';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { CATEGORIES } from '@/constants/categories';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';
import { formatDayMonth } from '@/utils/date';

const SOURCE_LABEL: Record<string, string> = {
  manual: 'Manual', text: 'Texto', voice: 'Voz', receipt: 'Comprobante',
  yape: 'Yape', plin: 'Plin', recurring: 'Recurrente',
};

export default function TransactionDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const transaction = useFinancialStore((s) => s.snapshot.transactions.find((t) => t.id === id));
  const deleteTransaction = useFinancialStore((s) => s.deleteTransaction);

  if (!transaction) {
    return (
      <Screen edges={{ top: true }}>
        <View style={{ padding: theme.spacing.xl, gap: theme.spacing.md }}>
          <Text variant="title">Movimiento no encontrado</Text>
          <Button label="Volver" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const cat = CATEGORIES[transaction.category];
  const isIncome = transaction.kind === 'income';

  const confirmDelete = () => {
    Alert.alert('Eliminar movimiento', '¿Seguro que quieres eliminar este movimiento? Se ajustará tu saldo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          deleteTransaction(transaction.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen edges={{ top: true }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.xl, gap: theme.spacing.md }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={10}>
          <Icon name="chevron-left" size={26} color="secondary" />
        </Pressable>
        <Text variant="subtitle" style={{ flex: 1 }}>Detalle</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: 0, gap: theme.spacing.xl }}>
        <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
          <View style={{ width: 64, height: 64, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface.interactive, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={cat.icon} size={30} color={isIncome ? 'positive' : 'secondary'} />
          </View>
          <Money amount={transaction.amount} size="large" color={isIncome ? 'positive' : 'primary'} />
          <Text variant="body" color="secondary">{isIncome ? 'Ingreso' : 'Gasto'} · {cat.label}</Text>
        </View>

        <Card>
          <Row label="Descripción" value={transaction.description} />
          <Row label="Fecha" value={formatDayMonth(transaction.date)} />
          <Row label="Origen" value={SOURCE_LABEL[transaction.source ?? 'manual'] ?? 'Manual'} last />
        </Card>

        <Button label="Eliminar movimiento" variant="secondary" icon="trash-2" fullWidth onPress={confirmDelete} />
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.md, borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.colors.border.subtle }}>
      <Text variant="body" color="muted">{label}</Text>
      <Text variant="bodyStrong" style={{ flex: 1, textAlign: 'right' }} numberOfLines={1}>{value}</Text>
    </View>
  );
}
