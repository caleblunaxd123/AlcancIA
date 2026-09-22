import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { AlcanciaMascot, type MascotMood } from '@/components/financial/AlcanciaMascot';
import { Money } from '@/components/financial/Money';
import { formatMoney } from '@/engine/money';
import { projectGoal } from '@/engine/goals';
import { deriveWeather } from '@/engine/weather';
import { askAlcancIA, type AiAnswer } from '@/services/ai';
import { useAppStore } from '@/store/appStore';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';
import { formatMonthYear } from '@/utils/date';

const PROMPTS = [
  { key: 'buy', label: '¿Puedo comprar algo?', icon: 'shopping-bag' },
  { key: 'spending', label: 'Analizar mis gastos', icon: 'chart-line' },
  { key: 'goal', label: '¿Cómo voy con mi meta?', icon: 'target' },
  { key: 'save', label: 'Ayúdame a ahorrar', icon: 'piggy-bank' },
  { key: 'subs', label: 'Revisar mis suscripciones', icon: 'repeat' },
];

function intentFromQuestion(question: string): string {
  const normalized = question.toLowerCase();
  if (normalized.includes('meta')) return 'goal';
  if (normalized.includes('suscrip')) return 'subs';
  if (normalized.includes('gasto') || normalized.includes('mes')) return 'spending';
  if (normalized.includes('comprar') || normalized.includes('compra')) return 'buy';
  return 'save';
}

/** On-device fallback so conversation remains useful if the backend is unreachable. */
function localAnswer(key: string, snapshot: ReturnType<typeof useFinancialStore.getState>['snapshot']): AiAnswer {
  const weather = deriveWeather(snapshot);
  const sts = formatMoney(weather.safeToSpend.amount);
  if (key === 'goal') {
    const goal = snapshot.goals[0];
    if (goal) {
      const projection = projectGoal(goal);
      return {
        summary: `Vas ${Math.round(projection.progress * 100)}% en “${goal.name}”. Al ritmo actual podrías llegar cerca de ${projection.etaDate ? formatMonthYear(projection.etaDate) : 'tu fecha objetivo'}.`,
        impactLevel: 'medium',
        facts: [`Ya reuniste ${formatMoney(goal.saved, { hideDecimalsWhenRound: true })} de ${formatMoney(goal.target, { hideDecimalsWhenRound: true })}.`],
        recommendations: ['Un aporte adicional pequeño puede acortar el camino sin presionarte.'],
        calculationIds: ['goalProgress'],
        source: 'device',
      };
    }
  }
  if (key === 'subs') {
    const total = snapshot.subscriptions.reduce((acc, subscription) => acc + subscription.amount.minor, 0);
    return {
      summary: `Tus suscripciones suman ${formatMoney({ minor: total, currency: 'PEN' })} al mes.`,
      impactLevel: 'low',
      facts: [`Eso equivale a ${formatMoney({ minor: total * 12, currency: 'PEN' }, { hideDecimalsWhenRound: true })} al año.`],
      recommendations: ['Revisa primero las que no hayas utilizado durante este mes.'],
      calculationIds: ['subscriptions'],
      source: 'device',
    };
  }
  if (key === 'spending') {
    const largest = snapshot.transactions.filter((transaction) => transaction.kind === 'expense').sort((a, b) => b.amount.minor - a.amount.minor)[0];
    return {
      summary: largest ? `Tu movimiento más alto reciente fue ${largest.description}: ${formatMoney(largest.amount)}.` : 'Todavía necesito algunos movimientos para encontrar patrones.',
      impactLevel: 'low',
      facts: [`Hoy conservas ${sts} como dinero seguro para gastar.`],
      recommendations: ['Puedo ayudarte a revisar una categoría específica.'],
      calculationIds: ['safeToSpend', 'categorySummary'],
      source: 'device',
    };
  }
  return {
    summary: `${weather.headline} Tu dinero seguro para gastar hoy es ${sts}.`,
    impactLevel: 'low',
    facts: ['Tus obligaciones registradas ya están consideradas en este cálculo.'],
    recommendations: ['Puedes probar una compra o explorar una meta antes de decidir.'],
    calculationIds: ['safeToSpend'],
    source: 'device',
  };
}

export default function AssistantHome() {
  const theme = useTheme();
  const router = useRouter();
  const snapshot = useFinancialStore((state) => state.snapshot);
  const [answer, setAnswer] = useState<AiAnswer | null>(null);
  const [question, setQuestion] = useState('');
  const [lastQuestion, setLastQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState<MascotMood>('happy');
  const completeStep = useAppStore((state) => state.completeStep);
  const scrollRef = useRef<ScrollView>(null);
  const weather = deriveWeather(snapshot);
  const primaryGoal = snapshot.goals[0];

  useEffect(() => {
    completeStep('ask-ai');
  }, [completeStep]);

  const respond = async (text: string, explicitKey?: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const key = explicitKey ?? intentFromQuestion(trimmed);
    if (key === 'buy') {
      router.push('/puedo-comprarlo');
      return;
    }

    setQuestion('');
    setLastQuestion(trimmed);
    setLoading(true);
    setMood('thinking');
    setAnswer(null);
    try {
      const result = await askAlcancIA(trimmed, snapshot);
      setAnswer(result.answer);
    } catch {
      setAnswer(localAnswer(key, snapshot));
    } finally {
      setLoading(false);
      setMood('happy');
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: !theme.reducedMotion }));
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl, gap: theme.spacing.lg }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text variant="title">Asistente AlcancIA</Text>
              <Text variant="caption" color="positive">Contexto financiero actualizado</Text>
            </View>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.money.positive }} />
          </View>

          <Animated.View entering={theme.reducedMotion ? undefined : FadeInUp.duration(theme.motion.slow)}>
            <Card variant="highlight" style={{ minHeight: 190 }}>
              <View style={{ width: '62%', gap: theme.spacing.sm }}>
                <Text variant="subtitle">Hola 👋 Soy tu AlcancIA</Text>
                <Text variant="body" color="secondary">
                  Estoy mirando tu contexto para ayudarte a decidir, ahorrar y avanzar sin juzgarte.
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
                  <Icon name="shield-check" size={15} color="positive" />
                  <Text variant="caption" color="positive">Tus cálculos ocurren en el motor financiero</Text>
                </View>
              </View>
              <View style={{ position: 'absolute', right: 8, bottom: 4 }}>
                <AlcanciaMascot mood={mood} size={138} />
              </View>
            </Card>
          </Animated.View>

          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Card style={{ flex: 1, padding: theme.spacing.md }}>
              <Text variant="caption" color="muted">Disponible</Text>
              <Money amount={weather.safeToSpend.amount} size="small" color="positive" showDecimals={false} />
            </Card>
            {primaryGoal ? (
              <Card style={{ flex: 1, padding: theme.spacing.md }}>
                <Text variant="caption" color="muted" numberOfLines={1}>{primaryGoal.name}</Text>
                <Text variant="moneySmall" color="brand">{Math.round(projectGoal(primaryGoal).progress * 100)}%</Text>
              </Card>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {PROMPTS.map((prompt) => (
              <Pressable
                key={prompt.key}
                onPress={() => respond(prompt.label, prompt.key)}
                accessibilityRole="button"
                style={{
                  minHeight: 44,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  paddingHorizontal: theme.spacing.md,
                  borderRadius: theme.radius.pill,
                  borderWidth: 1,
                  borderColor: theme.colors.border.strong,
                  backgroundColor: theme.colors.surface.primary,
                }}
              >
                <Icon name={prompt.icon} size={16} color="brand" />
                <Text variant="caption">{prompt.label}</Text>
              </Pressable>
            ))}
          </View>

          {lastQuestion ? (
            <Animated.View entering={theme.reducedMotion ? undefined : FadeIn.duration(theme.motion.fast)} style={{ alignSelf: 'flex-end', maxWidth: '84%' }}>
              <View style={{ paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderRadius: theme.radius.xl, borderBottomRightRadius: theme.radius.sm, backgroundColor: theme.colors.brand.primary }}>
                <Text variant="body" color="onBrand">{lastQuestion}</Text>
              </View>
            </Animated.View>
          ) : null}

          {loading ? (
            <Card variant="highlight">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <ActivityIndicator color={theme.colors.brand.primary} />
                <View>
                  <Text variant="bodyStrong">Estoy revisando tus números…</Text>
                  <Text variant="caption" color="muted">Sin inventar montos ni decisiones.</Text>
                </View>
              </View>
            </Card>
          ) : null}

          {answer && !loading ? <AiAnswerCard answer={answer} /> : null}
        </ScrollView>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border.subtle, backgroundColor: theme.colors.background.secondary }}>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            onSubmitEditing={() => respond(question)}
            placeholder="Escribe un mensaje…"
            placeholderTextColor={theme.colors.text.muted}
            multiline
            accessibilityLabel="Mensaje para AlcancIA"
            style={{
              flex: 1,
              maxHeight: 104,
              minHeight: 48,
              borderRadius: theme.radius.xl,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
              backgroundColor: theme.colors.surface.primary,
              color: theme.colors.text.primary,
              fontFamily: theme.fontFamily.regular,
              fontSize: 15,
            }}
          />
          <Pressable
            onPress={() => respond(question)}
            disabled={!question.trim() || loading}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
            style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.brand.primary, opacity: !question.trim() || loading ? 0.45 : 1 }}
          >
            <Icon name="arrow-up" size={22} color="onBrand" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function AiAnswerCard({ answer }: { answer: AiAnswer }) {
  const theme = useTheme();
  return (
    <Animated.View entering={theme.reducedMotion ? undefined : FadeInUp.duration(theme.motion.normal)}>
      <Card variant="highlight">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.md }}>
          <Icon name="sparkles" size={17} color="brand" />
          <Text variant="label" color="brand">Lo que veo</Text>
        </View>
        <Text variant="body" style={{ lineHeight: 23 }}>{answer.summary}</Text>
        {answer.facts.map((fact, index) => (
          <View key={`fact-${index}`} style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start', marginTop: theme.spacing.md }}>
            <Icon name="circle-check" size={17} color="positive" />
            <Text variant="caption" color="secondary" style={{ flex: 1 }}>{fact}</Text>
          </View>
        ))}
        {answer.recommendations.map((recommendation, index) => (
          <View key={`recommendation-${index}`} style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start', marginTop: theme.spacing.sm }}>
            <Icon name="lightbulb" size={17} color="warning" />
            <Text variant="caption" color="secondary" style={{ flex: 1 }}>{recommendation}</Text>
          </View>
        ))}
        <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.lg }}>
          Tú decides. AlcancIA te muestra el impacto.
        </Text>
      </Card>
    </Animated.View>
  );
}
