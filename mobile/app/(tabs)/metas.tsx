import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { GoalCard } from '@/components/financial/GoalCard';
import { Screen } from '@/components/common/Screen';
import { PageHeader } from '@/components/common/PageHeader';
import { formatMoney, sum } from '@/engine/money';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';

export default function Metas() {
  const theme = useTheme();
  const router = useRouter();
  const goals = useFinancialStore((s) => s.snapshot.goals);

  const totalSaved = sum(goals.map((g) => g.saved));

  if (goals.length === 0) {
    return (
      <Screen>
        <View style={{ padding: theme.spacing.xl }}><PageHeader title="Mis metas" subtitle="Ahorra para lo que quieres, paso a paso" icon="target" /></View>
        <EmptyState
          title="Tus sueños empiezan aquí ✨"
          body="Crea tu primera meta y AlcancIA te mostrará el camino para llegar."
          actionLabel="Crear meta"
          mood="happy"
          onAction={() => router.push('/meta/nueva')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.huge, gap: theme.spacing.lg }} showsVerticalScrollIndicator={false}>
        <PageHeader title="Mis metas" subtitle={`${formatMoney(totalSaved, { hideDecimalsWhenRound: true })} ahorrados · toca una meta para aportar`} icon="target" />

        <View style={{ gap: theme.spacing.md }}>
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} onPress={() => router.push(`/meta/${g.id}`)} />
          ))}
        </View>

        <Button label="Nueva meta" icon="plus" variant="secondary" fullWidth onPress={() => router.push('/meta/nueva')} />
      </ScrollView>
    </Screen>
  );
}
