import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlcanciaMascot } from '@/components/financial/AlcanciaMascot';
import { AnimatedProgress } from '@/components/financial/AnimatedProgress';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { demoSnapshot, demoUser } from '@/data/demo';
import { formatMoney, fromMajor } from '@/engine/money';
import { buildSnapshotFromOnboarding, SUGGESTED_OBLIGATIONS } from '@/engine/onboarding';
import { calculateSafeToSpend } from '@/engine/safeToSpend';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
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

const PAY_DAYS = [1, 5, 10, 15, 20, 25, 28, 30];

type ObligationDraft = { amount: string; day: number };

/** Emergency fund suggestion: 3 months of fixed payments, rounded to S/ 100. */
function suggestedEmergencyTarget(obligations: Record<string, ObligationDraft>, fallback: number): number {
  const monthly = Object.values(obligations).reduce((acc, o) => acc + num(o.amount), 0);
  return monthly > 0 ? Math.ceil((monthly * 3) / 100) * 100 : fallback;
}

const GOAL_KINDS: { kind: GoalKind; label: string; icon: string; name: string; target: number }[] = [
  { kind: 'emergency', label: 'Emergencia', icon: 'shield', name: 'Fondo de emergencia', target: 6000 },
  { kind: 'home', label: 'Vivienda', icon: 'house', name: 'Inicial departamento', target: 20000 },
  { kind: 'travel', label: 'Viaje', icon: 'plane', name: 'Viaje', target: 3000 },
  { kind: 'tech', label: 'Tecnología', icon: 'smartphone', name: 'Tecnología', target: 2500 },
];

const num = (s: string) => parseFloat(s.replace(',', '.')) || 0;
const validAmount = (s: string, allowZero = false) => /^\d{1,9}([.,]\d{0,2})?$/.test(s.trim()) && (allowZero ? num(s) >= 0 : num(s) > 0);

type StepId = 'intro' | 'name' | 'household' | 'balance' | 'income' | 'payday' | 'obligations' | 'goal' | 'done';
const STEPS: StepId[] = ['intro', 'name', 'household', 'balance', 'income', 'payday', 'obligations', 'goal', 'done'];

export default function Onboarding() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const completeStep = useAppStore((s) => s.completeStep);
  const accountName = useAuthStore((s) => s.account?.name ?? '');
  const setSnapshot = useFinancialStore((s) => s.setSnapshot);

  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState(accountName);
  const [household, setHousehold] = useState<HouseholdType>('solo');
  const [balance, setBalance] = useState('');
  const [income, setIncome] = useState('');
  const [payDay, setPayDay] = useState(30);
  const [customPayDay, setCustomPayDay] = useState('');
  const [obligations, setObligations] = useState<Record<string, ObligationDraft>>({});
  const [goalKind, setGoalKind] = useState<GoalKind | null>('emergency');
  const [goalTarget, setGoalTarget] = useState('');

  const step = STEPS[stepIndex]!;
  const progress = stepIndex / (STEPS.length - 1);

  const answers = useMemo<OnboardingAnswers>(() => {
    const selectedGoal = GOAL_KINDS.find((g) => g.kind === goalKind);
    return {
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
        dayOfMonth: obligations[o.id]?.day ?? o.dayOfMonth,
        amount: num(obligations[o.id]?.amount ?? '') || o.defaultAmount,
      })),
      goal:
        selectedGoal != null
          ? {
              kind: selectedGoal.kind,
              name: selectedGoal.name,
              target: num(goalTarget),
              monthlyContribution: 0,
            }
          : null,
    };
  }, [name, household, balance, income, payDay, obligations, goalKind, goalTarget]);

  // What the user will see on Home, computed by the same engine — shown on the
  // final step so they leave onboarding understanding their numbers.
  const preview = useMemo(() => {
    if (step !== 'done') return null;
    const snap = buildSnapshotFromOnboarding(answers);
    return { sts: calculateSafeToSpend(snap), fixedMonthly: answers.obligations.reduce((a, o) => a + o.amount, 0) };
  }, [step, answers]);

  const goalLooksTooBig = num(goalTarget) > 0 && num(income) > 0 && num(goalTarget) > num(income) * 120;

  const finishReal = () => {
    setSnapshot(buildSnapshotFromOnboarding(answers));
    completeOnboarding('real', answers.name);
    if (answers.goal) completeStep('goal');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace('/(tabs)');
  };

  const exploreDemo = () => {
    setSnapshot(demoSnapshot);
    completeOnboarding('demo', demoUser.name);
    router.replace('/(tabs)');
  };

  const next = () => {
    Keyboard.dismiss();
    Haptics.selectionAsync().catch(() => {});
    if (stepIndex < STEPS.length - 1) setStepIndex((i) => i + (step === 'income' && num(income) === 0 ? 2 : 1));
  };
  const back = () => { Keyboard.dismiss(); setStepIndex((i) => Math.max(0, i - (step === 'obligations' && num(income) === 0 ? 2 : 1))); };

  const canContinue = useMemo(() => {
    switch (step) {
      case 'name':
        return name.trim().length > 0;
      case 'balance':
        return validAmount(balance, true);
      case 'income':
        return validAmount(income, true);
      case 'payday':
        return Number.isInteger(payDay) && payDay >= 1 && payDay <= 31;
      case 'obligations':
        return Object.values(obligations).every((o) => validAmount(o.amount) && Number.isInteger(o.day) && o.day >= 1 && o.day <= 31);
      case 'goal':
        return goalKind === null || validAmount(goalTarget);
      default:
        return true;
    }
  }, [step, name, balance, income, payDay, obligations, goalKind, goalTarget]);

  const toggleObligation = (id: string, defaultAmount: number, defaultDay: number) => {
    setObligations((prev) => {
      const copy = { ...prev };
      if (id in copy) delete copy[id];
      else copy[id] = { amount: String(defaultAmount), day: defaultDay };
      return copy;
    });
    Haptics.selectionAsync().catch(() => {});
  };

  const selectGoal = (kind: GoalKind, fallback: number) => {
    const deselect = goalKind === kind;
    setGoalKind(deselect ? null : kind);
    setGoalTarget(deselect ? '' : String(kind === 'emergency' ? suggestedEmergencyTarget(obligations, fallback) : fallback));
    Haptics.selectionAsync().catch(() => {});
  };

  const goNext = () => {
    // Emergency is preselected: give it the same suggested amount as a tap would.
    if (step === 'obligations' && goalKind === 'emergency' && goalTarget === '') {
      setGoalTarget(String(suggestedEmergencyTarget(obligations, GOAL_KINDS[0]!.target)));
    }
    next();
  };

  return (
    <Screen edges={{ top: true, bottom: true }}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
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
          <Text variant="caption" color="muted">Paso {stepIndex + 1} de {STEPS.length}</Text>
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
            <StepBody title="¿Cómo quieres que te llamemos?" subtitle="Puedes usar tu nombre o un apodo.">
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
              <TextField accessibilityLabel="Saldo disponible" prefix="S/" placeholder="0.00" keyboardType="decimal-pad" value={balance} onChangeText={setBalance} autoFocus helperText="Escribe 0 si hoy no tienes dinero disponible." error={balance && !validAmount(balance, true) ? 'Usa un monto positivo o cero, con hasta 2 decimales.' : undefined} />
            </StepBody>
          ) : null}

          {step === 'income' ? (
            <StepBody title="¿Cuánto recibes al mes?" subtitle="Tu ingreso principal aproximado.">
              <TextField accessibilityLabel="Ingreso mensual" prefix="S/" placeholder="0.00" keyboardType="decimal-pad" value={income} onChangeText={setIncome} autoFocus helperText="Si aún no recibes ingresos, escribe 0. Podrás registrarlos cuando lleguen." error={income && !validAmount(income, true) ? 'Usa un monto positivo o cero, con hasta 2 decimales.' : undefined} />
            </StepBody>
          ) : null}

          {step === 'payday' ? (
            <StepBody title="¿Qué día recibes tu ingreso?" subtitle="Con esto calculamos hasta cuándo debe alcanzarte.">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                {PAY_DAYS.map((d) => {
                  const active = payDay === d;
                  return (
                    <Pressable key={d} onPress={() => { setPayDay(d); setCustomPayDay(''); Haptics.selectionAsync().catch(() => {}); }} accessibilityRole="button" accessibilityState={{ selected: active }}
                      style={{ paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.xl, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: active ? theme.colors.brand.primary : theme.colors.border.subtle, backgroundColor: active ? theme.colors.brand.soft : theme.colors.surface.primary }}>
                      <Text variant="bodyStrong" color={active ? 'brand' : 'secondary'}>Día {d}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextField label="Otro día del mes" placeholder="Del 1 al 31" keyboardType="number-pad" maxLength={2} value={customPayDay} onChangeText={(value) => { setCustomPayDay(value); setPayDay(Number(value)); }} helperText="Si el mes tiene menos días, usamos su último día." error={!canContinue ? 'Elige un día entre 1 y 31.' : undefined} />
            </StepBody>
          ) : null}

          {step === 'obligations' ? (
            <StepBody title="¿Cuáles son tus pagos fijos?" subtitle="Marca los que pagas cada mes, cuánto y qué día. Así sabremos cuánto apartar. Es opcional.">
              <View style={{ gap: theme.spacing.sm }}>
                {SUGGESTED_OBLIGATIONS.map((o) => {
                  const draft = obligations[o.id];
                  const selected = draft !== undefined;
                  return (
                    <View key={o.id} style={{ borderRadius: theme.radius.lg, borderWidth: 1, borderColor: selected ? theme.colors.brand.primary : theme.colors.border.subtle, backgroundColor: theme.colors.surface.primary, padding: theme.spacing.md }}>
                      <Pressable onPress={() => toggleObligation(o.id, o.defaultAmount, o.dayOfMonth)} accessibilityRole="button" accessibilityState={{ selected }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                        <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? theme.colors.brand.primary : 'transparent', borderWidth: selected ? 0 : 1.5, borderColor: theme.colors.border.strong }}>
                          {selected ? <Icon name="check" size={15} color="onBrand" /> : null}
                        </View>
                        <Icon name={o.icon} size={18} color={selected ? 'brand' : 'secondary'} />
                        <Text variant="bodyStrong" color={selected ? 'brand' : 'primary'} style={{ flex: 1 }}>{o.label}</Text>
                      </Pressable>
                      {draft ? (
                        <View style={{ marginTop: theme.spacing.sm, gap: theme.spacing.sm }}>
                          <TextField
                            prefix="S/"
                            keyboardType="decimal-pad"
                            accessibilityLabel={`Monto de ${o.label}`}
                            value={draft.amount}
                            onChangeText={(v) => setObligations((p) => ({ ...p, [o.id]: { ...draft, amount: v } }))}
                            error={!validAmount(draft.amount) ? 'Escribe un monto mayor que cero o desmarca este pago.' : undefined}
                          />
                          <TextField label="Día de pago (1 al 31)" accessibilityLabel={`Día de pago de ${o.label}`} keyboardType="number-pad" maxLength={2} value={draft.day ? String(draft.day) : ''}
                            onChangeText={(value) => setObligations((p) => ({ ...p, [o.id]: { ...draft, day: Number(value) } }))}
                            error={draft.day < 1 || draft.day > 31 ? 'Escribe un día entre 1 y 31.' : undefined} />
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
                    <Pressable key={g.kind} onPress={() => selectGoal(g.kind, g.target)} accessibilityRole="button" accessibilityState={{ selected: active }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: active ? theme.colors.brand.primary : theme.colors.border.subtle, backgroundColor: active ? theme.colors.brand.soft : theme.colors.surface.primary }}>
                      <Icon name={g.icon} size={18} color={active ? 'brand' : 'secondary'} />
                      <Text variant="bodyStrong" color={active ? 'brand' : 'secondary'}>{g.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {goalKind ? (
                <View style={{ gap: theme.spacing.xs }}>
                  <TextField label="¿Cuánto quieres juntar?" prefix="S/" keyboardType="decimal-pad" value={goalTarget} onChangeText={setGoalTarget} error={!validAmount(goalTarget) ? 'Escribe un monto mayor que cero.' : undefined} />
                  <Text variant="caption" color={goalLooksTooBig ? 'warning' : 'muted'}>
                    {goalLooksTooBig
                      ? 'Es más de 10 años de tu ingreso. Revisa si el monto está bien escrito.'
                      : goalKind === 'emergency'
                        ? 'Sugerimos 3 meses de tus pagos fijos, por si pasa algo imprevisto.'
                        : 'Es un monto sugerido: cámbialo por el tuyo.'}
                  </Text>
                </View>
              ) : null}
            </StepBody>
          ) : null}

          {step === 'done' ? (
            <View style={{ gap: theme.spacing.lg }}>
              <Animated.View entering={FadeIn.duration(theme.motion.slow)} style={{ alignItems: 'center', gap: theme.spacing.sm }}>
                <AlcanciaMascot mood="happy" size={120} />
                <Text variant="title" center>Tu AlcancIA está lista</Text>
                <Text variant="body" color="secondary" center>Esto es lo que verás al entrar:</Text>
              </Animated.View>
              {preview ? (
                <Animated.View entering={FadeInUp.delay(150).duration(theme.motion.slow)} style={{ borderRadius: theme.radius.xl, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.subtle, padding: theme.spacing.lg, gap: theme.spacing.md }}>
                  <View>
                    <Text variant="caption" color="secondary">{num(income) > 0 ? 'Puedes gastar hasta tu próximo ingreso' : 'Disponible estimado para los próximos 30 días'}</Text>
                    <Text variant="moneyMedium" color="positive">{formatMoney(preview.sts.amount, { hideDecimalsWhenRound: true })}</Text>
                    <Text variant="caption" color="muted">
                      {num(income) > 0 ? `Cobras el día ${payDay} · faltan ${preview.sts.daysUntilIncome} día${preview.sts.daysUntilIncome === 1 ? '' : 's'}` : 'Sin próximo ingreso registrado · estimación para 30 días'}
                    </Text>
                  </View>
                  <SummaryRow icon="receipt" label="Pagos fijos al mes" value={preview.fixedMonthly > 0 ? formatMoney(fromMajor(preview.fixedMonthly), { hideDecimalsWhenRound: true }) : 'Ninguno'} />
                  {answers.goal ? (
                    <SummaryRow icon="target" label={`Meta: ${answers.goal.name}`} value={formatMoney(fromMajor(answers.goal.target), { hideDecimalsWhenRound: true })} />
                  ) : null}
                  <Text variant="caption" color="secondary">
                    Cada gasto o ingreso que registres actualiza estos números al instante.
                  </Text>
                </Animated.View>
              ) : null}
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
          <>
            <Button label="Ver mi resumen" size="lg" fullWidth disabled={!canContinue} icon="arrow-right" iconPosition="right" onPress={next} />
            <Button label="Crear mi meta después" variant="ghost" onPress={() => { setGoalKind(null); next(); }} />
          </>
        ) : (
          <Button label="Continuar" size="lg" fullWidth disabled={!canContinue} onPress={goNext} />
        )}
      </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function SummaryRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <Icon name={icon} size={18} color="secondary" />
      <Text variant="body" style={{ flex: 1 }}>{label}</Text>
      <Text variant="bodyStrong">{value}</Text>
    </View>
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
