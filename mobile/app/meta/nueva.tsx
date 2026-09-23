import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';
import { HeaderIconButton, PageHeader } from '@/components/common/PageHeader';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { fromMajor } from '@/engine/money';
import { useAppStore } from '@/store/appStore';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';
import type { Goal, GoalKind } from '@/types/domain';
import { createId } from '@/utils/id';
import { parseMoneyInput } from '@/utils/validation';

const KINDS: { kind: GoalKind; label: string; icon: string }[] = [
  { kind: 'home', label: 'Casa', icon: 'house' },
  { kind: 'travel', label: 'Viaje', icon: 'plane' },
  { kind: 'car', label: 'Auto', icon: 'car' },
  { kind: 'education', label: 'Estudios', icon: 'graduation-cap' },
  { kind: 'emergency', label: 'Emergencia', icon: 'shield' },
  { kind: 'wedding', label: 'Boda', icon: 'heart' },
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
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useFinancialStore((s) => s.snapshot.goals.find((item) => item.id === id));
  const addGoal = useFinancialStore((s) => s.addGoal);
  const updateGoal = useFinancialStore((s) => s.updateGoal);
  const completeStep = useAppStore((s) => s.completeStep);

  const [kind, setKind] = useState<GoalKind>(existing?.kind ?? 'home');
  const [name, setName] = useState(existing?.name ?? '');
  const [target, setTarget] = useState(existing ? String(existing.target.minor / 100) : '');
  const [monthly, setMonthly] = useState(existing ? String(existing.monthlyContribution.minor / 100) : '');

  const targetValue = parseMoneyInput(target);
  const monthlyValue = monthly.trim() ? parseMoneyInput(monthly) : 0;
  const canSave = targetValue !== null && monthlyValue !== null;

  const save = () => {
    if (!canSave) return;
    const payload: Goal = {
      id: existing?.id ?? createId('goal'),
      kind,
      name: name.trim() || DEFAULT_NAME[kind],
      target: fromMajor(targetValue!),
      saved: existing?.saved ?? fromMajor(0),
      monthlyContribution: fromMajor(monthlyValue!),
      priority: 'high',
    };
    const result = existing ? updateGoal(existing.id, payload) : addGoal(payload);
    if (!result.ok) {
      Alert.alert('No se pudo guardar', result.error);
      return;
    }
    if (!existing) completeStep('goal');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <Screen keyboardAware edges={{ top: true, bottom: true }}>
      <View style={{ padding: theme.spacing.xl }}><PageHeader eyebrow={existing ? 'Plan en evolución' : 'Un sueño con plan'} title={existing ? 'Editar meta' : 'Nueva meta'} subtitle={existing ? 'Actualiza el objetivo sin perder tu avance' : 'Dale nombre, monto y ritmo'} icon="target" action={<HeaderIconButton icon="x" label="Cerrar" onPress={() => router.back()} />} /></View>

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

        <Button label={existing ? 'Guardar cambios' : 'Crear meta'} size="lg" fullWidth icon="check" disabled={!canSave} onPress={save} />
      </ScrollView>
    </Screen>
  );
}
