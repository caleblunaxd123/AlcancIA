import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlcanciaMascot } from '@/components/financial/AlcanciaMascot';
import { FinancialHouse } from '@/components/financial/FinancialHouse';
import { AnimatedProgress } from '@/components/financial/AnimatedProgress';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { demoSnapshot, demoUser } from '@/data/demo';
import { buildSnapshotFromOnboarding, SUGGESTED_OBLIGATIONS } from '@/engine/onboarding';
import { useAppStore } from '@/store/appStore';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';
import type { GoalKind } from '@/types/domain';
import type { HouseholdType, OnboardingAnswers } from '@/types/onboarding';
import { EMPTY_ONBOARDING } from '@/types/onboarding';

const HOUSEHOLDS: { id: HouseholdType; label: string; icon: string }[] = [
  { id: 'solo', label: 'Solo yo', icon: 'user' },
  { id: 'couple', label: 'Con mi pareja', icon: 'heart' },
  { id: 'family', label: 'Con mi familia', icon: 'users' },
  { id: 'roommates', label: 'Con roommates', icon: 'users-round' },
];

const PAY_DAYS = [1, 5, 10, 15, 28, 30];

const GOAL_KINDS: { kind: GoalKind; label: string; icon: string; name: string; target: number }[] = [
  { kind: 'emergency', label: 'Emergencia', icon: 'shield', name: 'Fondo de emergencia', target: 6000 },
  { kind: 'home', label: 'Vivienda', icon: 'house', name: 'Inicial departamento', target: 20000 },
  { kind: 'travel', label: 'Viaje', icon: 'plane', name: 'Viaje', target: 3000 },
  { kind: 'tech', label: 'Tecnología', icon: 'smartphone', name: 'Tecnología', target: 2500 },
];

const num = (s: string) => parseFloat(s.replace(',', '.')) || 0;

type StepId = 'intro' | 'name' | 'household' | 'balance' | 'income' | 'payday' | 'obligations' | 'goal' | 'done';
const STEPS: StepId[] = ['intro', 'name', 'household', 'balance', 'income', 'payday', 'obligations', 'goal', 'done'];

export default function Onboarding() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const setSnapshot = useFinancialStore((s) => s.setSnapshot);

  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState('');
  const [household, setHousehold] = useState<HouseholdType>('solo');
  const [balance, setBalance] = useState('');
  const [income, setIncome] = useState('');
  const [payDay, setPayDay] = useState(30);
  const [obligations, setObligations] = useState<Record<string, string>>({});
  const [goalKind, setGoalKind] = useState<GoalKind | null>('emergency');
  const [goalTarget, setGoalTarget] = useState('');

  const step = STEPS[stepIndex]!;
  const progress = stepIndex / (STEPS.length - 1);

  const finishReal = () => {
    const selectedGoal = GOAL_KINDS.find((g) => g.kind === goalKind);
    const answers: OnboardingAnswers = {
      ...EMPTY_ONBOARDING,
      name: name.trim() || 'ahí',
      householdType: household,
      currentBalance: num(balance),
      monthlyIncome: num(income),
      payDay,
      obligations: SUGGESTED_OBLIGATIONS.filter((o) => obligations[o.id] !== undefined).map((o) => ({
        id: o.id,
        label: o.label,
        category: o.category,
        dayOfMonth: o.dayOfMonth,
        amount: num(obligations[o.id] ?? '') || o.defaultAmount,
      })),
      goal:
        selectedGoal != null
          ? {
              kind: selectedGoal.kind,
              name: selectedGoal.name,
              target: num(goalTarget) || selectedGoal.target,
              monthlyContribution: 0,
            }
          : null,
    };
    setSnapshot(buildSnapshotFromOnboarding(answers));
    completeOnboarding('real', answers.name);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace('/(tabs)');
  };

  const exploreDemo = () => {
    setSnapshot(demoSnapshot);
    completeOnboarding('demo', demoUser.name);
    router.replace('/(tabs)');
  };

  const next = () => {
    Haptics.selectionAsync().catch(() => {});
    if (stepIndex < STEPS.length - 1) setStepIndex((i) => i + 1);
  };
  const back = () => setStepIndex((i) => Math.max(0, i - 1));

  const canContinue = useMemo(() => {
    switch (step) {
      case 'name':
        return name.trim().length > 0;
      case 'balance':
        return balance.length > 0;
      case 'income':
        return num(income) > 0;
      default:
        return true;
    }
  }, [step, name, balance, income]);

  const toggleObligation = (id: string, defaultAmount: number) => {
    setObligations((prev) => {
      const copy = { ...prev };
      if (id in copy) delete copy[id];
      else copy[id] = String(defaultAmount);
      return copy;
    });
    Haptics.selectionAsync().catch(() => {});
  };

  return (
    <Screen edges={{ top: true, bottom: true }}>
      {/* Top bar: back + progress + skip */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.sm }}>
        {stepIndex > 0 && step !== 'done' ? (
          <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Atrás" hitSlop={10}>
            <Icon name="chevron-left" size={24} color="secondary" />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
        <View style={{ flex: 1 }}>
          <AnimatedProgress progress={progress} height={6} />
        </View>
        {step !== 'done' ? (
          <Pressable onPress={exploreDemo} accessibilityRole="button" hitSlop={8}>
            <Text variant="caption" color="muted">Ver ejemplo</Text>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: theme.spacing.xxl, justifyContent: 'center', gap: theme.spacing.xl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View key={step} entering={FadeIn.duration(theme.motion.normal)} style={{ gap: theme.spacing.xl }}>
          {step === 'intro' ? (
            <View style={{ alignItems: 'center', gap: theme.spacing.lg }}>
              <AlcanciaMascot mood="happy" size={170} />
              <Text variant="title" center>Tu dinero tiene una historia</Text>
              <Text variant="body" color="secondary" center>
                Vamos a entenderla juntos. Te haré unas preguntas rápidas para armar tu AlcancIA. Toma 2 minutos.
              </Text>
            </View>
          ) : null}

          {step === 'name' ? (
            <StepBody title="¿Cómo te llamas?" subtitle="Para hablarte por tu nombre.">
              <TextField placeholder="Tu nombre" value={name} onChangeText={setName} autoFocus autoCapitalize="words" returnKeyType="done" onSubmitEditing={() => canContinue && next()} />
            </StepBody>
          ) : null}

          {step === 'household' ? (
            <StepBody title="¿Cómo administrarás AlcancIA?" subtitle="Puedes cambiarlo después.">
              <View style={{ gap: theme.spacing.sm }}>
                {HOUSEHOLDS.map((h) => {
                  const active = household === h.id;
                  return (
                    <Pressable key={h.id} onPress={() => { setHousehold(h.id); Haptics.selectionAsync().catch(() => {}); }} accessibilityRole="button" accessibilityState={{ selected: active }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.lg, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: active ? theme.colors.brand.primary : theme.colors.border.subtle, backgroundColor: active ? theme.colors.brand.soft : theme.colors.surface.primary }}>
                      <Icon name={h.icon} size={22} color={active ? 'brand' : 'secondary'} />
                      <Text variant="bodyStrong" color={active ? 'brand' : 'primary'} style={{ flex: 1 }}>{h.label}</Text>
                      {active ? <Icon name="check" size={20} color="brand" /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </StepBody>
          ) : null}

          {step === 'balance' ? (
            <StepBody title="¿Cuánto tienes disponible ahora?" subtitle="Tu saldo aproximado en cuentas y efectivo.">
              <TextField prefix="S/" placeholder="0.00" keyboardType="decimal-pad" value={balance} onChangeText={setBalance} autoFocus />
            </StepBody>
          ) : null}

          {step === 'income' ? (
            <StepBody title="¿Cuánto recibes al mes?" subtitle="Tu ingreso principal aproximado.">
              <TextField prefix="S/" placeholder="0.00" keyboardType="decimal-pad" value={income} onChangeText={setIncome} autoFocus />
            </StepBody>
          ) : null}

          {step === 'payday' ? (
            <StepBody title="¿Qué día recibes tu ingreso?" subtitle="Con esto calculamos hasta cuándo debe alcanzarte.">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                {PAY_DAYS.map((d) => {
                  const active = payDay === d;
                  return (
                    <Pressable key={d} onPress={() => { setPayDay(d); Haptics.selectionAsync().catch(() => {}); }} accessibilityRole="button" accessibilityState={{ selected: active }}
                      style={{ paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.xl, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: active ? theme.colors.brand.primary : theme.colors.border.subtle, backgroundColor: active ? theme.colors.brand.soft : theme.colors.surface.primary }}>
                      <Text variant="bodyStrong" color={active ? 'brand' : 'secondary'}>Día {d}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </StepBody>
          ) : null}

          {step === 'obligations' ? (
            <StepBody title="¿Cuáles son tus pagos fijos?" subtitle="Marca los que tengas y ajusta el monto. Es opcional.">
              <View style={{ gap: theme.spacing.sm }}>
                {SUGGESTED_OBLIGATIONS.map((o) => {
                  const selected = o.id in obligations;
                  return (
                    <View key={o.id} style={{ borderRadius: theme.radius.lg, borderWidth: 1, borderColor: selected ? theme.colors.brand.primary : theme.colors.border.subtle, backgroundColor: theme.colors.surface.primary, padding: theme.spacing.md }}>
                      <Pressable onPress={() => toggleObligation(o.id, o.defaultAmount)} accessibilityRole="button" accessibilityState={{ selected }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                        <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? theme.colors.brand.primary : 'transparent', borderWidth: selected ? 0 : 1.5, borderColor: theme.colors.border.strong }}>
                          {selected ? <Icon name="check" size={15} color="onBrand" /> : null}
                        </View>
                        <Icon name={o.icon} size={18} color={selected ? 'brand' : 'secondary'} />
                        <Text variant="bodyStrong" color={selected ? 'brand' : 'primary'} style={{ flex: 1 }}>{o.label}</Text>
                      </Pressable>
                      {selected ? (
                        <View style={{ marginTop: theme.spacing.sm }}>
                          <TextField prefix="S/" keyboardType="decimal-pad" value={obligations[o.id] ?? ''} onChangeText={(v) => setObligations((p) => ({ ...p, [o.id]: v }))} />
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </StepBody>
          ) : null}

          {step === 'goal' ? (
            <StepBody title="¿Para qué quieres ahorrar?" subtitle="Elige una meta para empezar. Podrás añadir más.">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                {GOAL_KINDS.map((g) => {
                  const active = goalKind === g.kind;
                  return (
                    <Pressable key={g.kind} onPress={() => { setGoalKind(active ? null : g.kind); setGoalTarget(active ? '' : String(g.target)); Haptics.selectionAsync().catch(() => {}); }} accessibilityRole="button" accessibilityState={{ selected: active }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: active ? theme.colors.brand.primary : theme.colors.border.subtle, backgroundColor: active ? theme.colors.brand.soft : theme.colors.surface.primary }}>
                      <Icon name={g.icon} size={18} color={active ? 'brand' : 'secondary'} />
                      <Text variant="bodyStrong" color={active ? 'brand' : 'secondary'}>{g.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {goalKind ? (
                <TextField label="Monto objetivo" prefix="S/" keyboardType="decimal-pad" value={goalTarget} onChangeText={setGoalTarget} />
              ) : null}
            </StepBody>
          ) : null}

          {step === 'done' ? (
            <View style={{ alignItems: 'center', gap: theme.spacing.lg }}>
              <Animated.View entering={FadeIn.duration(theme.motion.slow)}>
                <FinancialHouse health={0.7} savingsProgress={0.4} weather="stable" width={300} />
              </Animated.View>
              <Animated.View entering={FadeInUp.delay(200).duration(theme.motion.slow)} style={{ alignItems: 'center', gap: theme.spacing.sm }}>
                <Text variant="title" center>Tu AlcancIA está lista 🎉</Text>
                <Text variant="body" color="secondary" center>
                  Ya puedes ver tu dinero seguro para gastar y empezar a cumplir tus metas.
                </Text>
              </Animated.View>
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      {/* Bottom action */}
      <View style={{ paddingHorizontal: theme.spacing.xxl, paddingBottom: insets.bottom + theme.spacing.lg, gap: theme.spacing.sm }}>
        {step === 'intro' ? (
          <>
            <Button label="Empezar" size="lg" fullWidth icon="arrow-right" iconPosition="right" onPress={next} />
            <Button label="Explorar con datos de ejemplo" variant="ghost" onPress={exploreDemo} haptic={false} />
          </>
        ) : step === 'done' ? (
          <Button label="Entrar a AlcancIA" size="lg" fullWidth icon="sparkles" onPress={finishReal} />
        ) : step === 'goal' ? (
          <Button label="Casi listo" size="lg" fullWidth icon="arrow-right" iconPosition="right" onPress={next} />
        ) : (
          <Button label="Continuar" size="lg" fullWidth disabled={!canContinue} onPress={next} />
        )}
      </View>
    </Screen>
  );
}

function StepBody({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.lg }}>
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="title">{title}</Text>
        {subtitle ? <Text variant="body" color="secondary">{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}
