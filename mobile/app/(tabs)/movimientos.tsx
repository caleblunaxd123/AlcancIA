import { SectionList, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { TransactionRow } from '@/components/financial/TransactionRow';
import { formatMoney, sum } from '@/engine/money';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';
import { formatDayMonth } from '@/utils/date';

export default function Movimientos() {
  const theme = useTheme();
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
            <Text variant="title" style={{ marginBottom: theme.spacing.lg }}>
              Movimientos
            </Text>
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
        renderItem={({ item }) => <TransactionRow transaction={item} />}
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
    <View style={{ padding: theme.spacing.xl }}>
      <Text variant="title">Movimientos</Text>
    </View>
  );
}
