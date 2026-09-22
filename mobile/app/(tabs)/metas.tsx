import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { GoalCard } from '@/components/financial/GoalCard';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
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
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Text variant="title">Metas</Text>
            <Text variant="caption" color="muted">
              Ahorrado en total: {formatMoney(totalSaved, { hideDecimalsWhenRound: true })}
            </Text>
          </View>
        </View>

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
