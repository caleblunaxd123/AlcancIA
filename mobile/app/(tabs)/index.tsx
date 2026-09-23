import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Text } from '@/components/common/Text';
import { FinancialHouse } from '@/components/financial/FinancialHouse';
import { FirstStepsCard } from '@/components/financial/FirstStepsCard';
import { GoalTile } from '@/components/financial/GoalTile';
import { HomeHero } from '@/components/financial/HomeHero';
import { InsightCard } from '@/components/financial/InsightCard';
import { MissionCard } from '@/components/financial/MissionCard';
import { MoneyAllocationCard } from '@/components/financial/MoneyAllocationCard';
import { NextStepCard } from '@/components/financial/NextStepCard';
import { QuickActions } from '@/components/financial/QuickActions';
import { UpcomingList } from '@/components/financial/UpcomingList';
import { computeAllocation } from '@/engine/allocation';
import { computeNextStep } from '@/engine/nextStep';
import { buildMissions } from '@/features/challenges/missions';
import { useHomeData } from '@/features/home/useHomeData';
import { useLightStatusBar } from '@/hooks/useLightStatusBar';
import { useAppStore } from '@/store/appStore';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';

const TOTAL_STEPS = 4;

/**
 * Home, banking layout — top to bottom it answers, in order:
 *   1. How much can I spend?         (brand band)
 *   2. What can I do right now?      (quick actions)
 *   3. What should I do next?        (one guidance card)
 *   4. Where does my money go?       (this month)
 *   5. What's coming?                (upcoming payments)
 *   6. What am I saving for?         (goals carousel)
 *   7. How am I doing overall?       (home, mission, insights)
 */
export default function Home() {
  const theme = useTheme();
  const router = useRouter();
  const { weather, insights, savingsProgress, upcoming, topGoals } = useHomeData();
  const name = useAppStore((s) => s.name);
  const completedSteps = useAppStore((s) => s.completedSteps);
  const stepsDismissed = useAppStore((s) => s.stepsDismissed);
  const snapshot = useFinancialStore((s) => s.snapshot);

  const showSteps = !stepsDismissed && completedSteps.length < TOTAL_STEPS;
  const featuredMission = buildMissions(snapshot)[1];
  const allocation = useMemo(() => computeAllocation(snapshot), [snapshot]);
  const nextStep = useMemo(
    () =>
      computeNextStep(snapshot, {
        askedAi: completedSteps.includes('ask-ai'),
        usedSimulator: completedSteps.includes('review'),
      }),
    [snapshot, completedSteps],
  );

  useLightStatusBar();

  let delay = 0;
  const enter = () => {
    delay += theme.staggerStep;
    return theme.reducedMotion ? undefined : FadeInDown.delay(delay).duration(theme.motion.normal);
  };

  return (
    <Screen edges={{ top: false }}>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.huge }} showsVerticalScrollIndicator={false}>
        <HomeHero name={name} weather={weather} balance={snapshot.currentBalance} onOpenMenu={() => router.push('/mas')} />

        <View style={{ paddingHorizontal: theme.spacing.xl, marginTop: -theme.spacing.giant, gap: theme.spacing.xxl }}>
          <Animated.View entering={enter()}>
            <QuickActions />
          </Animated.View>

          {/* Exactly one guidance surface: the checklist while new, then a single next step. */}
          <Animated.View entering={enter()}>
            {showSteps ? <FirstStepsCard /> : <NextStepCard step={nextStep} />}
          </Animated.View>

          <Animated.View entering={enter()}>
            <MoneyAllocationCard result={allocation} onAddIncome={() => router.push({ pathname: '/movimiento/nuevo', params: { kind: 'income' } })} />
          </Animated.View>

          {upcoming.length > 0 ? (
            <Animated.View entering={enter()}>
              <SectionHeader title="Próximos pagos" actionLabel="Calendario" onAction={() => router.push('/calendario')} />
              <UpcomingList items={upcoming} onPress={() => router.push('/calendario')} />
            </Animated.View>
          ) : null}

          <Animated.View entering={enter()}>
            <SectionHeader
              title="Mis metas"
              subtitle={topGoals.length > 0 ? 'Toca una meta para aportar' : undefined}
              actionLabel={topGoals.length > 0 ? 'Ver todas' : undefined}
              onAction={() => router.push('/(tabs)/metas')}
            />
            {topGoals.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                // Bleed to the screen edges so tiles scroll under the padding.
                style={{ marginHorizontal: -theme.spacing.xl }}
                contentContainerStyle={{ paddingHorizontal: theme.spacing.xl, gap: theme.spacing.md }}
              >
                {topGoals.map((g) => (
                  <GoalTile key={g.id} goal={g} onPress={() => router.push(`/meta/${g.id}`)} />
                ))}
                <NewGoalTile onPress={() => router.push('/meta/nueva')} />
              </ScrollView>
            ) : (
              <Pressable onPress={() => router.push('/meta/nueva')} accessibilityRole="button" accessibilityLabel="Crear mi primera meta">
                <Card variant="highlight">
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface.primary, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="target" size={22} color="brand" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong">Crea tu primera meta</Text>
                      <Text variant="caption" color="secondary">Un viaje, un fondo de emergencia, tu depa… te decimos cuánto ahorrar.</Text>
                    </View>
                    <Icon name="chevron-right" size={20} color="brand" />
                  </View>
                </Card>
              </Pressable>
            )}
          </Animated.View>

          <Animated.View entering={enter()}>
            <SectionHeader title="Tu hogar financiero" subtitle="Crece cada vez que ahorras" />
            <View style={{ alignItems: 'center' }}>
              <FinancialHouse health={savingsProgress} savingsProgress={savingsProgress} weather={weather.state} />
            </View>
          </Animated.View>

          {featuredMission ? (
            <Animated.View entering={enter()}>
              <SectionHeader title="Tu misión de la semana" actionLabel="Ver misiones" onAction={() => router.push('/retos')} />
              <MissionCard mission={featuredMission} compact onPress={() => router.push('/retos')} />
            </Animated.View>
          ) : null}

          {insights.length > 0 ? (
            <Animated.View entering={enter()}>
              <SectionHeader title="AlcancIA detectó" />
              <View style={{ gap: theme.spacing.md }}>
                {insights.map((ins) => (
                  <InsightCard
                    key={ins.id}
                    title={ins.title}
                    body={ins.body}
                    icon={ins.icon}
                    actionLabel="Ver detalle"
                    onAction={() => router.push(ins.id.startsWith('emergency') ? '/(tabs)/metas' : '/(tabs)/movimientos')}
                  />
                ))}
              </View>
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

function NewGoalTile({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Crear una nueva meta"
      style={({ pressed }) => ({
        width: 140,
        borderRadius: theme.radius.xl,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: theme.colors.border.active,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        padding: theme.spacing.lg,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="plus" size={22} color="brand" />
      </View>
      <Text variant="bodyStrong" color="brand" center>Nueva meta</Text>
    </Pressable>
  );
}
