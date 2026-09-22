import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AlcanciaMascot, type MascotMood } from '@/components/financial/AlcanciaMascot';
import { Card } from '@/components/common/Card';
import { Chip } from '@/components/common/Chip';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { formatMoney } from '@/engine/money';
import { deriveWeather } from '@/engine/weather';
import { projectGoal } from '@/engine/goals';
import { askAlcancIA, type AiAnswer } from '@/services/ai';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';
import { formatMonthYear } from '@/utils/date';

const PROMPTS = [
  { key: 'buy', label: '¿Puedo comprar algo?', icon: 'sparkles' },
  { key: 'goal', label: '¿Cómo voy con mi meta?', icon: 'target' },
  { key: 'save', label: 'Ayúdame a ahorrar', icon: 'piggy-bank' },
  { key: 'week', label: '¿Por qué gasté más este mes?', icon: 'chart-line' },
  { key: 'subs', label: 'Revisar mis suscripciones', icon: 'repeat' },
];

/** On-device fallback so chat works even if the backend is unreachable (§69). */
function localAnswer(key: string, snapshot: ReturnType<typeof useFinancialStore.getState>['snapshot']): AiAnswer {
  const weather = deriveWeather(snapshot);
  const sts = formatMoney(weather.safeToSpend.amount);
  if (key === 'goal') {
    const goal = snapshot.goals[0];
    if (goal) {
      const p = projectGoal(goal);
      return {
        summary: `Vas ${Math.round(p.progress * 100)}% en "${goal.name}" (${formatMoney(goal.saved, { hideDecimalsWhenRound: true })} de ${formatMoney(goal.target, { hideDecimalsWhenRound: true })}). Al ritmo actual llegarías cerca de ${p.etaDate ? formatMonthYear(p.etaDate) : 'pronto'}.`,
        impactLevel: 'medium',
        facts: [`Dinero seguro para gastar: ${sts}`],
        recommendations: ['Sumar un poco cada mes acorta el camino.'],
        calculationIds: ['goalProgress'],
        source: 'device',
      };
    }
  }
  if (key === 'subs') {
    const total = snapshot.subscriptions.reduce((acc, s) => acc + s.amount.minor, 0);
    return {
      summary: `Tus suscripciones suman ${formatMoney({ minor: total, currency: 'PEN' })} al mes — unos ${formatMoney({ minor: total * 12, currency: 'PEN' }, { hideDecimalsWhenRound: true })} al año.`,
      impactLevel: 'low',
      facts: ['Vale la pena revisar cuáles usas de verdad.'],
      recommendations: [],
      calculationIds: ['subscriptions'],
      source: 'device',
    };
  }
  return {
    summary: `${weather.headline} Tu dinero seguro para gastar hoy es ${sts}.`,
    impactLevel: 'low',
    facts: [],
    recommendations: ['Pregúntame por una compra, tus metas o tus gastos.'],
    calculationIds: ['safeToSpend'],
    source: 'device',
  };
}

export default function AssistantHome() {
  const theme = useTheme();
  const router = useRouter();
  const snapshot = useFinancialStore((s) => s.snapshot);
  const [answer, setAnswer] = useState<AiAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState<MascotMood>('happy');

  const respond = async (key: string, label: string) => {
    if (key === 'buy') {
      router.push('/puedo-comprarlo');
      return;
    }

    setLoading(true);
    setMood('thinking');
    setAnswer(null);
    try {
      const result = await askAlcancIA(label, snapshot);
      setAnswer(result.answer);
    } catch {
      // Backend unreachable → deterministic on-device answer.
      setAnswer(localAnswer(key, snapshot));
    } finally {
      setLoading(false);
      setMood('happy');
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.huge, gap: theme.spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
          <AlcanciaMascot mood={mood} size={110} />
          <Text variant="title" center>
            Hola 👋
          </Text>
          <Text variant="body" color="secondary" center>
            Estoy mirando tu contexto financiero. ¿Qué quieres explorar?
          </Text>
        </View>

        {loading ? (
          <Card variant="highlight">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <ActivityIndicator color={theme.colors.brand.primary} />
              <Text variant="body" color="secondary">
                AlcancIA está pensando…
              </Text>
            </View>
          </Card>
        ) : null}

        {answer && !loading ? (
          <Animated.View entering={theme.reducedMotion ? undefined : FadeIn.duration(theme.motion.normal)}>
            <Card variant="highlight">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.sm }}>
                <Icon name="sparkles" size={16} color="brand" />
                <Text variant="label" color="brand">
                  AlcancIA
                </Text>
              </View>
              <Text variant="body" style={{ lineHeight: 22 }}>
                {answer.summary}
              </Text>

              {answer.facts.length > 0 ? (
                <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.md }}>
                  {answer.facts.map((f, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
                      <Icon name="check" size={16} color="positive" />
                      <Text variant="caption" color="secondary" style={{ flex: 1 }}>
                        {f}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {answer.recommendations.length > 0 ? (
                <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.md }}>
                  {answer.recommendations.map((r, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
                      <Icon name="lightbulb" size={16} color="warning" />
                      <Text variant="caption" color="secondary" style={{ flex: 1 }}>
                        {r}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          </Animated.View>
        ) : null}

        <View style={{ gap: theme.spacing.sm }}>
          {PROMPTS.map((p) => (
            <Chip key={p.key} label={p.label} icon={p.icon} onPress={() => respond(p.key, p.label)} />
          ))}
        </View>

        <Text variant="caption" color="muted" center>
          Las respuestas se calculan con tu motor financiero real. Con backend AI activo, AlcancIA además las explica.
        </Text>
      </ScrollView>
    </Screen>
  );
}
