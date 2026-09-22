import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { fromMajor } from '@/engine/money';
import { useAppStore } from '@/store/appStore';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';
import type { GoalKind } from '@/types/domain';

const KINDS: { kind: GoalKind; label: string; icon: string }[] = [
  { kind: 'home', label: 'Casa', icon: 'house' },
  { kind: 'travel', label: 'Viaje', icon: 'plane' },
  { kind: 'car', label: 'Auto', icon: 'car' },
  { kind: 'education', label: 'Estudios', icon: 'graduation-cap' },
  { kind: 'emergency', label: 'Emergencia', icon: 'shield' },
  { kind: 'tech', label: 'Tecnología', icon: 'smartphone' },
  { kind: 'pet', label: 'Mascota', icon: 'paw-print' },
  { kind: 'custom', label: 'Otro', icon: 'target' },
];

const DEFAULT_NAME: Record<GoalKind, string> = {
  home: 'Inicial departamento', travel: 'Viaje', car: 'Mi auto', education: 'Estudios',
  emergency: 'Fondo de emergencia', wedding: 'Boda', tech: 'Tecnología', pet: 'Mascota', custom: 'Mi meta',
};

export default function NewGoal() {
  const theme = useTheme();
  const router = useRouter();
  const addGoal = useFinancialStore((s) => s.addGoal);
  const completeStep = useAppStore((s) => s.completeStep);

  const [kind, setKind] = useState<GoalKind>('home');
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [monthly, setMonthly] = useState('');

  const targetValue = parseFloat(target.replace(',', '.')) || 0;
  const monthlyValue = parseFloat(monthly.replace(',', '.')) || 0;
  const canSave = targetValue > 0;

  const save = () => {
    if (!canSave) return;
    addGoal({
      id: `goal-${Date.now()}`,
      kind,
      name: name.trim() || DEFAULT_NAME[kind],
      target: fromMajor(targetValue),
      saved: fromMajor(0),
      monthlyContribution: fromMajor(monthlyValue),
      priority: 'high',
    });
    completeStep('goal');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <Screen edges={{ top: true, bottom: true }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.xl }}>
        <Text variant="title">Nueva meta</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={10}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface.primary }}>
          <Icon name="x" size={22} color="secondary" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: 0, gap: theme.spacing.xl }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="label" color="muted">¿Qué quieres lograr?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {KINDS.map((k) => {
              const active = kind === k.kind;
              return (
                <Pressable
                  key={k.kind}
                  onPress={() => { setKind(k.kind); Haptics.selectionAsync().catch(() => {}); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: active ? theme.colors.brand.primary : theme.colors.border.subtle, backgroundColor: active ? theme.colors.brand.soft : theme.colors.surface.primary }}
                >
                  <Icon name={k.icon} size={16} color={active ? 'brand' : 'secondary'} />
                  <Text variant="caption" color={active ? 'brand' : 'secondary'}>{k.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TextField label="Nombre" placeholder={DEFAULT_NAME[kind]} value={name} onChangeText={setName} />
        <TextField label="Meta a alcanzar" prefix="S/" placeholder="0.00" keyboardType="decimal-pad" value={target} onChangeText={setTarget} />
        <TextField label="Aporte mensual (opcional)" prefix="S/" placeholder="0.00" keyboardType="decimal-pad" value={monthly} onChangeText={setMonthly} />

        <Button label="Crear meta" size="lg" fullWidth icon="check" disabled={!canSave} onPress={save} />
      </ScrollView>
    </Screen>
  );
}
