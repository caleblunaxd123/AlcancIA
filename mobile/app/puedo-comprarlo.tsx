import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AlcanciaMascot, type MascotMood } from '@/components/financial/AlcanciaMascot';
import { Money } from '@/components/financial/Money';
import { ScenarioSlider } from '@/components/financial/ScenarioSlider';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Chip } from '@/components/common/Chip';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { fromMajor, toMajor } from '@/engine/money';
import { simulatePurchase, type PurchaseVerdict } from '@/engine/purchase';
import { useAppStore } from '@/store/appStore';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';

const PRESETS = [
  { label: 'Zapatillas', amount: 350, icon: 'footprints' },
  { label: 'PlayStation', amount: 2200, icon: 'gamepad-2' },
  { label: 'Cena', amount: 120, icon: 'utensils' },
  { label: 'Celular', amount: 1800, icon: 'smartphone' },
  { label: 'Viaje', amount: 900, icon: 'plane' },
];

const VERDICT_STYLE: Record<PurchaseVerdict, { color: 'positive' | 'warning' | 'negative'; dot: string; icon: string; mood: MascotMood }> = {
  compatible: { color: 'positive', dot: '🟢', icon: 'circle-check', mood: 'happy' },
  tight: { color: 'warning', dot: '🟡', icon: 'circle-alert', mood: 'thinking' },
  compromises: { color: 'negative', dot: '🔴', icon: 'circle-x', mood: 'warning' },
};

export default function CanIBuyIt() {
  const theme = useTheme();
  const router = useRouter();
  const snapshot = useFinancialStore((s) => s.snapshot);
  const completeStep = useAppStore((s) => s.completeStep);

  useEffect(() => {
    completeStep('review');
  }, [completeStep]);

  const safeMajor = toMajor(snapshot.currentBalance);
  const sliderMax = Math.max(2000, Math.round(safeMajor));
  const [amount, setAmount] = useState(350);
  const [category, setCategory] = useState<string | null>(null);

  const sim = useMemo(
    () => simulatePurchase(snapshot, fromMajor(amount).minor),
    [snapshot, amount],
  );
  const vs = VERDICT_STYLE[sim.verdict];

  const onSlide = (v: number) => {
    setAmount(v);
    Haptics.selectionAsync().catch(() => {});
  };

  return (
    <Screen edges={{ top: true, bottom: true }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.xl }}>
        <Text variant="title">¿Puedo comprarlo?</Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          hitSlop={10}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface.primary }}
        >
          <Icon name="x" size={22} color="secondary" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: 0, gap: theme.spacing.xl }} showsVerticalScrollIndicator={false}>
        {/* Amount + slider */}
        <Card>
          <Text variant="label" color="muted">
            Monto
          </Text>
          <View style={{ alignItems: 'center', marginVertical: theme.spacing.lg }}>
            <Money amount={fromMajor(amount)} size="display" showDecimals={false} />
          </View>
          <ScenarioSlider
            min={0}
            max={sliderMax}
            step={10}
            value={amount}
            onChange={onSlide}
            formatValue={(v) => `S/ ${v.toLocaleString('es-PE')}`}
          />
        </Card>

        {/* Category presets */}
        <View>
          <Text variant="label" color="muted" style={{ marginBottom: theme.spacing.md }}>
            ¿Qué es? (opcional)
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {PRESETS.map((p) => (
              <Chip
                key={p.label}
                label={p.label}
                icon={p.icon}
                selected={category === p.label}
                onPress={() => {
                  setCategory(p.label);
                  setAmount(p.amount);
                  Haptics.selectionAsync().catch(() => {});
                }}
              />
            ))}
          </View>
        </View>

        {/* Balance scale ANTES / DESPUÉS */}
        <Card variant="highlight">
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, alignItems: 'center', gap: theme.spacing.xs }}>
              <Text variant="label" color="muted">
                Antes
              </Text>
              <Money amount={sim.before} size="medium" showDecimals={false} />
            </View>
            <Icon name="arrow-right" size={24} color="brand" />
            <View style={{ flex: 1, alignItems: 'center', gap: theme.spacing.xs }}>
              <Text variant="label" color="muted">
                Después
              </Text>
              <Money amount={sim.after} size="medium" color={sim.wouldExceed ? 'negative' : 'positive'} showDecimals={false} />
            </View>
          </View>
        </Card>

        {/* Verdict + mascot */}
        <Animated.View entering={theme.reducedMotion ? undefined : FadeIn.duration(theme.motion.normal)}>
          <Card variant={sim.verdict === 'compatible' ? 'success' : 'default'}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <AlcanciaMascot mood={vs.mood} size={64} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
                  <Icon name={vs.icon} size={18} color={vs.color} />
                  <Text variant="subtitle" color={vs.color}>
                    {sim.headline}
                  </Text>
                </View>
                <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.xxs }}>
                  Tú decides. AlcancIA solo te muestra el impacto.
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Impact detail */}
        <Card>
          <ImpactRow
            icon={sim.obligationsCovered ? 'check' : 'alert-circle'}
            iconColor={sim.obligationsCovered ? 'positive' : 'warning'}
            label="Tus próximos pagos"
            value={sim.obligationsCovered ? 'Cubiertos' : 'Quedarían ajustados'}
          />
          {sim.goalImpact ? (
            <ImpactRow
              icon="target"
              iconColor="secondary"
              label={`Meta ${sim.goalImpact.goal.name}`}
              value={sim.goalImpact.daysDelayed > 0 ? `+${sim.goalImpact.daysDelayed} días aprox.` : 'Sin cambios'}
            />
          ) : null}
          <ImpactRow icon="shield" iconColor="secondary" label="Margen de seguridad" valueMoney={sim.after} last />
        </Card>

        <Button
          label="Guardar simulación"
          variant="secondary"
          icon="bookmark"
          fullWidth
          onPress={() => router.back()}
        />
      </ScrollView>
    </Screen>
  );
}

function ImpactRow({
  icon,
  iconColor,
  label,
  value,
  valueMoney,
  last,
}: {
  icon: string;
  iconColor: 'positive' | 'warning' | 'secondary';
  label: string;
  value?: string;
  valueMoney?: import('@/types/money').Money;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.colors.border.subtle,
      }}
    >
      <Icon name={icon} size={20} color={iconColor} />
      <Text variant="body" color="secondary" style={{ flex: 1 }}>
        {label}
      </Text>
      {valueMoney ? (
        <Money amount={valueMoney} size="small" showDecimals={false} />
      ) : (
        <Text variant="bodyStrong">{value}</Text>
      )}
    </View>
  );
}
