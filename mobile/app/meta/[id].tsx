import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AlcanciaMascot, type MascotMood } from '@/components/financial/AlcanciaMascot';
import { AnimatedProgress } from '@/components/financial/AnimatedProgress';
import { MoneyCounter } from '@/components/financial/MoneyCounter';
import { ScenarioSlider } from '@/components/financial/ScenarioSlider';
import { GoalCover } from '@/components/financial/GoalCover';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { toMajor } from '@/engine/money';
import { daysSooner, projectGoal, projectWithExtra } from '@/engine/goals';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';
import { formatMonthYear } from '@/utils/date';

export default function GoalDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goal = useFinancialStore((s) => s.snapshot.goals.find((g) => g.id === id));
  const contribute = useFinancialStore((s) => s.contributeToGoal);
  const deleteGoal = useFinancialStore((s) => s.deleteGoal);

  const confirmDelete = () => {
    Alert.alert('Eliminar meta', '¿Seguro que quieres eliminar esta meta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          if (id) deleteGoal(id);
          router.back();
        },
      },
    ]);
  };

  const [extra, setExtra] = useState(0);
  const [mood, setMood] = useState<MascotMood>('neutral');

  const base = useMemo(() => (goal ? projectGoal(goal) : null), [goal]);
  const boosted = useMemo(
    () => (goal ? projectWithExtra(goal, extra) : null),
    [goal, extra],
  );

  if (!goal || !base) {
    return (
      <Screen edges={{ top: true }}>
        <View style={{ padding: theme.spacing.xl }}>
          <Text variant="title">Meta no encontrada</Text>
          <Button label="Volver" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const sooner = boosted ? daysSooner(base, boosted) : 0;

  const onContribute = () => {
    contribute(goal.id, 15000); // S/ 150
    setMood('celebrating');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(() => setMood('happy'), 2200);
  };

  return (
    <Screen edges={{ top: true }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.xl, gap: theme.spacing.md }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={10}>
          <Icon name="chevron-left" size={26} color="secondary" />
        </Pressable>
        <Text variant="subtitle" style={{ flex: 1 }}>
          {goal.name}
        </Text>
        <Pressable onPress={confirmDelete} accessibilityRole="button" accessibilityLabel="Eliminar meta" hitSlop={10}>
          <Icon name="trash-2" size={22} color="muted" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: 0, gap: theme.spacing.xl }} showsVerticalScrollIndicator={false}>
        <Card padded={false} variant="goal">
          <GoalCover kind={goal.kind} height={184} progress={base.progress} />
          <View style={{ padding: theme.spacing.xl, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text variant="label" color="muted">Ahorrado hasta hoy</Text>
              <MoneyCounter value={toMajor(goal.saved)} variant="moneyLarge" color="primary" />
              <Text variant="caption" color="muted">
                de {toMajor(goal.target).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
              </Text>
            </View>
            <AlcanciaMascot mood={mood} size={86} />
          </View>
        </Card>

        <Card variant="goal">
          <Text variant="label" color="muted" style={{ marginBottom: theme.spacing.sm }}>
            Tu camino
          </Text>
          <AnimatedProgress progress={base.progress} height={14} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.md }}>
            <View>
              <Text variant="caption" color="muted">
                Al ritmo actual
              </Text>
              <Text variant="bodyStrong">{base.etaDate ? formatMonthYear(base.etaDate) : '—'}</Text>
            </View>
            {sooner > 0 && boosted?.etaDate ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="caption" color="muted">
                  Con tu aporte extra
                </Text>
                <Text variant="bodyStrong" color="positive">
                  {formatMonthYear(boosted.etaDate)}
                </Text>
              </View>
            ) : null}
          </View>
        </Card>

        <Card>
          <ScenarioSlider
            label="Aporte mensual extra"
            min={0}
            max={500}
            step={50}
            value={extra}
            onChange={(v) => {
              setExtra(v);
              Haptics.selectionAsync().catch(() => {});
            }}
            formatValue={(v) => `S/ ${v}`}
          />
          {sooner > 0 ? (
            <Animated.View entering={theme.reducedMotion ? undefined : FadeIn} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.lg }}>
              <Icon name="sparkles" size={16} color="positive" />
              <Text variant="body" color="secondary" style={{ flex: 1 }}>
                Sumando S/ {extra} al mes llegarías <Text variant="bodyStrong" color="positive">~{sooner} días</Text> antes.
              </Text>
            </Animated.View>
          ) : null}
        </Card>

        <Button label="Agregar S/ 150" icon="plus" size="lg" fullWidth onPress={onContribute} />
      </ScrollView>
    </Screen>
  );
}
