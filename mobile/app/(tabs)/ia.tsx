import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AlcanciaMascot } from '@/components/financial/AlcanciaMascot';
import { Card } from '@/components/common/Card';
import { Chip } from '@/components/common/Chip';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { formatMoney } from '@/engine/money';
import { deriveWeather } from '@/engine/weather';
import { projectGoal } from '@/engine/goals';
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

export default function AssistantHome() {
  const theme = useTheme();
  const router = useRouter();
  const snapshot = useFinancialStore((s) => s.snapshot);
  const [answer, setAnswer] = useState<{ title: string; body: string } | null>(null);

  const respond = (key: string) => {
    if (key === 'buy') {
      router.push('/puedo-comprarlo');
      return;
    }
    const weather = deriveWeather(snapshot);
    if (key === 'goal') {
      const goal = snapshot.goals[0];
      if (goal) {
        const p = projectGoal(goal);
        setAnswer({
          title: goal.name,
          body: `Vas ${Math.round(p.progress * 100)}% (${formatMoney(goal.saved, { hideDecimalsWhenRound: true })} de ${formatMoney(goal.target, { hideDecimalsWhenRound: true })}). Al ritmo actual llegarías cerca de ${p.etaDate ? formatMonthYear(p.etaDate) : 'pronto'}. Si sumas un poco cada mes, se acorta el camino.`,
        });
      }
      return;
    }
    if (key === 'save') {
      setAnswer({
        title: 'Una idea para ahorrar',
        body: `Tu dinero seguro para gastar es ${formatMoney(weather.safeToSpend.amount)}. Separar una parte apenas recibes tu ingreso suele funcionar mejor que ahorrar lo que sobra al final.`,
      });
      return;
    }
    if (key === 'subs') {
      const total = snapshot.subscriptions.reduce((acc, s) => acc + s.amount.minor, 0);
      setAnswer({
        title: 'Tus suscripciones',
        body: `Hoy suman ${formatMoney({ minor: total, currency: 'PEN' })} al mes — unos ${formatMoney({ minor: total * 12, currency: 'PEN' }, { hideDecimalsWhenRound: true })} al año. Vale la pena revisar cuáles usas de verdad.`,
      });
      return;
    }
    setAnswer({
      title: 'Tu mes en breve',
      body: `${weather.headline} Mira Movimientos para ver dónde se fue tu dinero por categoría; ahí es más fácil detectar el cambio.`,
    });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.huge, gap: theme.spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
          <AlcanciaMascot mood="happy" size={110} />
          <Text variant="title" center>
            Hola 👋
          </Text>
          <Text variant="body" color="secondary" center>
            Estoy mirando tu contexto financiero. ¿Qué quieres explorar?
          </Text>
        </View>

        {answer ? (
          <Animated.View entering={theme.reducedMotion ? undefined : FadeIn.duration(theme.motion.normal)}>
            <Card variant="highlight">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.sm }}>
                <Icon name="sparkles" size={16} color="brand" />
                <Text variant="label" color="brand">
                  {answer.title}
                </Text>
              </View>
              <Text variant="body" style={{ lineHeight: 22 }}>
                {answer.body}
              </Text>
            </Card>
          </Animated.View>
        ) : null}

        <View style={{ gap: theme.spacing.sm }}>
          {PROMPTS.map((p) => (
            <Chip key={p.key} label={p.label} icon={p.icon} onPress={() => respond(p.key)} />
          ))}
        </View>

        <Text variant="caption" color="muted" center>
          La IA conversacional se conecta en la Fase 5. Estas respuestas ya se calculan con tu motor financiero real.
        </Text>
      </ScrollView>
    </Screen>
  );
}
