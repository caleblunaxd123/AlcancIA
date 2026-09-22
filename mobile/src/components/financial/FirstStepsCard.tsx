import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { AnimatedProgress } from './AnimatedProgress';
import { useAppStore, type FirstStepId } from '@/store/appStore';
import { useTheme } from '@/theme';

type Step = { id: FirstStepId; label: string; icon: string; href: string };

const STEPS: Step[] = [
  { id: 'transaction', label: 'Registra tu primer movimiento', icon: 'plus', href: '/movimiento/nuevo' },
  { id: 'goal', label: 'Crea una meta de ahorro', icon: 'target', href: '/meta/nueva' },
  { id: 'ask-ai', label: 'Pregúntale a AlcancIA', icon: 'sparkles', href: '/(tabs)/ia' },
  { id: 'review', label: 'Prueba "¿Puedo comprarlo?"', icon: 'shield-check', href: '/puedo-comprarlo' },
];

/**
 * The first-run guide (§26/§33). A new user is never left wondering what to do:
 * this checklist gives concrete next actions, tracks progress, and quietly
 * disappears once they're up and running.
 */
export function FirstStepsCard() {
  const theme = useTheme();
  const router = useRouter();
  const completed = useAppStore((s) => s.completedSteps);
  const dismissSteps = useAppStore((s) => s.dismissSteps);

  const done = STEPS.filter((s) => completed.includes(s.id)).length;
  const progress = done / STEPS.length;

  return (
    <Card variant="highlight">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          <Icon name="rocket" size={16} color="brand" />
          <Text variant="label" color="brand">Primeros pasos</Text>
        </View>
        {done > 0 ? (
          <Pressable onPress={dismissSteps} accessibilityRole="button" accessibilityLabel="Ocultar primeros pasos" hitSlop={8}>
            <Text variant="caption" color="muted">Ocultar</Text>
          </Pressable>
        ) : null}
      </View>

      <Text variant="subtitle" style={{ marginBottom: theme.spacing.xs }}>
        {done === 0 ? 'Empecemos juntos 🌱' : done === STEPS.length ? '¡Todo listo! 🎉' : `Vas ${done} de ${STEPS.length}`}
      </Text>
      <Text variant="caption" color="secondary" style={{ marginBottom: theme.spacing.md }}>
        Da estos pasos y AlcancIA empezará a entender tu dinero.
      </Text>

      <AnimatedProgress progress={progress} />

      <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.md }}>
        {STEPS.map((step) => {
          const isDone = completed.includes(step.id);
          return (
            <Pressable
              key={step.id}
              onPress={() => router.push(step.href as never)}
              accessibilityRole="button"
              accessibilityLabel={step.label}
              accessibilityState={{ checked: isDone }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.sm }}
            >
              <View
                style={{
                  width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isDone ? theme.colors.money.positive : 'transparent',
                  borderWidth: isDone ? 0 : 1.5, borderColor: theme.colors.border.strong,
                }}
              >
                {isDone ? <Icon name="check" size={15} color="onAccent" /> : <Icon name={step.icon} size={14} color="muted" />}
              </View>
              <Text variant="body" color={isDone ? 'muted' : 'primary'} style={{ flex: 1, textDecorationLine: isDone ? 'line-through' : 'none' }}>
                {step.label}
              </Text>
              {!isDone ? <Icon name="chevron-right" size={18} color="muted" /> : null}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
