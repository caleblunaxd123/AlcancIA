import { useRouter } from 'expo-router';
import { Pressable, SectionList, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { TransactionRow } from '@/components/financial/TransactionRow';
import { formatMoney, sum } from '@/engine/money';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';
import { formatDayMonth } from '@/utils/date';

function AddButton() {
  const theme = useTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/movimiento/nuevo')}
      accessibilityRole="button"
      accessibilityLabel="Nuevo movimiento"
      hitSlop={8}
      style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.brand.soft, borderWidth: 1, borderColor: theme.colors.border.active }}
    >
      <Icon name="plus" size={22} color="brand" />
    </Pressable>
  );
}

export default function Movimientos() {
  const theme = useTheme();
  const router = useRouter();
  const snapshot = useFinancialStore((s) => s.snapshot);
  const txs = snapshot.transactions;

  const income = sum(txs.filter((t) => t.kind === 'income').map((t) => t.amount));
  const expense = sum(txs.filter((t) => t.kind === 'expense').map((t) => t.amount));

  // Group by date for section headers.
  const grouped = txs.reduce<Record<string, typeof txs>>((acc, t) => {
    (acc[t.date] ??= []).push(t);
    return acc;
  }, {});
  const sections = Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({ title: formatDayMonth(date), data: grouped[date]! }));

  if (txs.length === 0) {
    return (
      <Screen>
        <Header />
        <EmptyState
          title="Todavía está tranquilo por aquí 🌱"
          body="Registra tu primer gasto y AlcancIA comenzará a entender tu dinero."
          actionLabel="Registrar gasto"
          onAction={() => router.push('/movimiento/nuevo')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.huge }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ marginBottom: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg }}>
              <Text variant="title">Movimientos</Text>
              <AddButton />
            </View>
            <Card>
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, gap: theme.spacing.xxs }}>
                  <Text variant="label" color="muted">
                    Ingresos
                  </Text>
                  <Text variant="moneyMedium" color="positive">
                    {formatMoney(income, { hideDecimalsWhenRound: true })}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: theme.spacing.xxs }}>
                  <Text variant="label" color="muted">
                    Gastos
                  </Text>
                  <Text variant="moneyMedium">{formatMoney(expense, { hideDecimalsWhenRound: true })}</Text>
                </View>
              </View>
            </Card>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text variant="label" color="muted" style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.xs }}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: '/movimiento/[id]', params: { id: item.id } })} accessibilityRole="button">
            <TransactionRow transaction={item} />
          </Pressable>
        )}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: theme.colors.border.subtle }} />
        )}
      />
    </Screen>
  );
}

function Header() {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.xl }}>
      <Text variant="title">Movimientos</Text>
      <AddButton />
    </View>
  );
}
