import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AlcanciaMascot } from '@/components/financial/AlcanciaMascot';
import { FinancialHouse } from '@/components/financial/FinancialHouse';
import { FinancialWeather } from '@/components/financial/FinancialWeather';
import { GoalCard } from '@/components/financial/GoalCard';
import { InsightCard } from '@/components/financial/InsightCard';
import { SafeToSpendCard } from '@/components/financial/SafeToSpendCard';
import { UpcomingPayment } from '@/components/financial/UpcomingPayment';
import { FirstStepsCard } from '@/components/financial/FirstStepsCard';
import { HomeCompanionCard } from '@/components/financial/HomeCompanionCard';
import { MissionCard } from '@/components/financial/MissionCard';
import { Screen } from '@/components/common/Screen';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Text } from '@/components/common/Text';
import { useHomeData } from '@/features/home/useHomeData';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/theme';
import { greeting } from '@/utils/greeting';
import { useFinancialStore } from '@/store/financialStore';
import { buildMissions } from '@/features/challenges/missions';
import { sum } from '@/engine/money';

const TOTAL_STEPS = 4;

export default function Home() {
  const theme = useTheme();
  const router = useRouter();
  const { weather, insights, health, savingsProgress, nextPayment, topGoals } = useHomeData();
  const name = useAppStore((s) => s.name);
  const completedSteps = useAppStore((s) => s.completedSteps);
  const stepsDismissed = useAppStore((s) => s.stepsDismissed);
  const showSteps = !stepsDismissed && completedSteps.length < TOTAL_STEPS;
  const displayName = name || 'ahí';
  const snapshot = useFinancialStore((s) => s.snapshot);
  const totalSaved = sum(snapshot.goals.map((goal) => goal.saved));
  const featuredMission = buildMissions(snapshot)[1];

  let delay = 0;
  const nextDelay = () => {
    delay += theme.staggerStep;
    return theme.reducedMotion ? undefined : FadeInDown.delay(delay).duration(theme.motion.normal);
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.huge, gap: theme.spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={nextDelay()}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text variant="title">
                {greeting()}, {displayName} 👋
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Perfil y módulos"
              onPress={() => router.push('/mas')}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: theme.colors.surface.primary,
                borderWidth: 1,
                borderColor: theme.colors.border.subtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlcanciaMascot mood="neutral" size={40} animate={false} />
            </Pressable>
          </View>
          <FinancialWeather weather={weather} />
        </Animated.View>

        <Animated.View entering={nextDelay()}>
          <HomeCompanionCard totalSaved={totalSaved} onPress={() => router.push('/(tabs)/ia')} />
        </Animated.View>

        {/* Safe to spend hero */}
        <Animated.View entering={nextDelay()}>
          <SafeToSpendCard result={weather.safeToSpend} onAskCanIBuy={() => router.push('/puedo-comprarlo')} />
        </Animated.View>

        {/* First-run guidance — helps a brand-new user know what to do next. */}
        {showSteps ? (
          <Animated.View entering={nextDelay()}>
            <FirstStepsCard />
          </Animated.View>
        ) : null}

        {/* Financial house */}
        <Animated.View entering={nextDelay()}>
          <SectionHeader title="Tu casa" />
          <View style={{ alignItems: 'center' }}>
            <FinancialHouse health={health} savingsProgress={savingsProgress} weather={weather.state} />
            <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.sm }}>
              Estado {health > 0.66 ? 'próspero' : health > 0.4 ? 'estable' : 'en camino'}
            </Text>
          </View>
        </Animated.View>

        {/* Next payment */}
        {nextPayment ? (
          <Animated.View entering={nextDelay()}>
            <SectionHeader title="Próximo movimiento" actionLabel="Calendario" onAction={() => router.push('/calendario')} />
            <UpcomingPayment
              label={nextPayment.label}
              amount={nextPayment.amount}
              whenLabel={nextPayment.whenLabel}
              icon={nextPayment.icon}
              onPress={() => router.push('/calendario')}
            />
          </Animated.View>
        ) : null}

        {/* Goals */}
        {topGoals.length > 0 ? (
          <Animated.View entering={nextDelay()}>
            <SectionHeader title="Metas" actionLabel="Ver todas" onAction={() => router.push('/(tabs)/metas')} />
            <View style={{ gap: theme.spacing.md }}>
              {topGoals.map((g) => (
                <GoalCard key={g.id} goal={g} onPress={() => router.push(`/meta/${g.id}`)} />
              ))}
            </View>
          </Animated.View>
        ) : null}

        {featuredMission ? (
          <Animated.View entering={nextDelay()}>
            <SectionHeader title="Tu misión" actionLabel="Ver misiones" onAction={() => router.push('/retos')} />
            <MissionCard mission={featuredMission} compact onPress={() => router.push('/retos')} />
          </Animated.View>
        ) : null}

        {/* Insights */}
        {insights.length > 0 ? (
          <Animated.View entering={nextDelay()}>
            <SectionHeader title="AlcancIA detectó" />
            <View style={{ gap: theme.spacing.md }}>
              {insights.map((ins) => (
                <InsightCard key={ins.id} title={ins.title} body={ins.body} icon={ins.icon} actionLabel="Ver por qué" />
              ))}
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
