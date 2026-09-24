import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AlcanciaMascot, type MascotMood } from '@/components/financial/AlcanciaMascot';
import { AnimatedProgress } from '@/components/financial/AnimatedProgress';
import { MoneyCounter } from '@/components/financial/MoneyCounter';
import { ScenarioSlider } from '@/components/financial/ScenarioSlider';
import { GoalCover } from '@/components/financial/GoalCover';
import { Button } from '@/components/common/Button';
import { BottomSheet } from '@/components/common/BottomSheet';
import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { HeaderIconButton, PageHeader } from '@/components/common/PageHeader';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { formatMoney, toMajor } from '@/engine/money';
import { daysSooner, projectGoal, projectWithExtra } from '@/engine/goals';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';
import { formatMonthYear } from '@/utils/date';

export default function GoalDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goal = useFinancialStore((s) => s.snapshot.goals.find((g) => g.id === id));
  const currentBalance = useFinancialStore((s) => s.snapshot.currentBalance);
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
  const [contributionOpen, setContributionOpen] = useState(false);
  const [contribution, setContribution] = useState('');
  const [contributionError, setContributionError] = useState('');

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
  // No monthly plan yet: the slider IS the plan, so show when it gets there.
  const hasPlan = goal.monthlyContribution.minor > 0;
  const planMonths = !hasPlan && extra > 0 ? boosted?.monthsRemaining ?? null : null;

  const onContribute = () => {
    const amount = Number(contribution.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      setContributionError('Ingresa un monto válido mayor a cero.');
      return;
    }
    const result = contribute(goal.id, Math.round(amount * 100));
    if (!result.ok) {
      setContributionError(result.error);
      return;
    }
    setContribution('');
    setContributionError('');
    setContributionOpen(false);
    setMood('celebrating');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(() => setMood('happy'), 2200);
  };

  return (
    <Screen edges={{ top: true }}>
      <View style={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.lg }}>
        <PageHeader
          eyebrow="Meta"
          title={goal.name}
          onBack={() => router.back()}
          action={
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <HeaderIconButton icon="pencil" label="Editar meta" color="brand" onPress={() => router.push({ pathname: '/meta/nueva', params: { id: goal.id } })} />
              <HeaderIconButton icon="trash-2" label="Eliminar meta" onPress={confirmDelete} />
            </View>
          }
        />
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
              <Text variant="bodyStrong">{base.etaDate ? formatMonthYear(base.etaDate) : 'Sin aporte mensual'}</Text>
            </View>
            {(sooner > 0 || planMonths != null) && boosted?.etaDate ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="caption" color="muted">
                  {hasPlan ? 'Con tu aporte extra' : `Con S/ ${extra} al mes`}
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
            label={hasPlan ? 'Aporte mensual extra' : 'Si ahorras cada mes'}
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
          {planMonths != null ? (
            <Animated.View entering={theme.reducedMotion ? undefined : FadeIn} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.lg }}>
              <Icon name="sparkles" size={16} color="positive" />
              <Text variant="body" color="secondary" style={{ flex: 1 }}>
                Ahorrando S/ {extra} al mes completas tu meta en <Text variant="bodyStrong" color="positive">{planMonths} {planMonths === 1 ? 'mes' : 'meses'}</Text>.
              </Text>
            </Animated.View>
          ) : !hasPlan && extra === 0 ? (
            <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.md }}>
              Mueve el control para ver en cuánto tiempo llegas.
            </Text>
          ) : sooner > 0 ? (
            <Animated.View entering={theme.reducedMotion ? undefined : FadeIn} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.lg }}>
              <Icon name="sparkles" size={16} color="positive" />
              <Text variant="body" color="secondary" style={{ flex: 1 }}>
                Sumando S/ {extra} al mes llegarías <Text variant="bodyStrong" color="positive">~{sooner} días</Text> antes.
              </Text>
            </Animated.View>
          ) : null}
        </Card>

        <Button label="Agregar aporte" icon="plus" size="lg" fullWidth onPress={() => setContributionOpen(true)} />
      </ScrollView>
      <BottomSheet visible={contributionOpen} onClose={() => setContributionOpen(false)} title="Aportar a tu meta">
        <Text variant="body" color="secondary">
          El aporte se descontará de tu saldo y quedará registrado en Movimientos.
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="caption" color="muted">Saldo disponible</Text>
          <Text variant="bodyStrong">{formatMoney(currentBalance)}</Text>
        </View>
        <TextField
          label="Monto del aporte"
          prefix="S/"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={contribution}
          onChangeText={(value) => { setContribution(value); setContributionError(''); }}
          error={contributionError || undefined}
          autoFocus
        />
        <Button label="Confirmar aporte" icon="check" fullWidth onPress={onContribute} />
      </BottomSheet>
    </Screen>
  );
}
