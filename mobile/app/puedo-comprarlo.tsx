import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
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
import { TextField } from '@/components/common/TextField';
import { parseMoneyInput } from '@/utils/validation';
import { HeaderIconButton, PageHeader } from '@/components/common/PageHeader';
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
  const [amountInput, setAmountInput] = useState('350');
  const parsedAmount = parseMoneyInput(amountInput);
  const amount = parsedAmount ?? 0;
  const sliderMax = Math.max(2000, Math.round(safeMajor), amount);
  const [category, setCategory] = useState<string | null>(null);

  const sim = useMemo(
    () => parsedAmount === null ? null : simulatePurchase(snapshot, fromMajor(parsedAmount).minor),
    [snapshot, parsedAmount],
  );
  const vs = sim ? VERDICT_STYLE[sim.verdict] : null;

  const onSlide = (v: number) => {
    setAmountInput(String(v));
    Haptics.selectionAsync().catch(() => {});
  };

  return (
    <Screen keyboardAware edges={{ top: true, bottom: true }}>
      <View style={{ padding: theme.spacing.xl }}>
        <PageHeader title="¿Puedo comprarlo?" subtitle="Escribe el precio y mira el impacto antes de gastar" icon="scan-line" action={<HeaderIconButton icon="x" label="Cerrar" onPress={() => router.back()} />} />
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: 0, gap: theme.spacing.xl }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Amount + slider */}
        <Card>
          <TextField label="Precio de la compra" prefix="S/" keyboardType="decimal-pad" value={amountInput} onChangeText={setAmountInput} helperText="Es una simulación: no registra un gasto ni realiza una compra." error={parsedAmount === null ? 'Escribe un precio mayor que cero, con hasta 2 decimales.' : undefined} />
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
                  setAmountInput(String(p.amount));
                  Haptics.selectionAsync().catch(() => {});
                }}
              />
            ))}
          </View>
        </View>

        {sim && vs ? <>
        {/* Balance scale ANTES / DESPUÉS */}
        <Card variant="highlight">
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, alignItems: 'center', gap: theme.spacing.xs }}>
              <Text variant="label" color="muted">
                Disponible antes
              </Text>
              <Money amount={sim.before} size="medium" />
            </View>
            <Icon name="arrow-right" size={24} color="brand" />
            <View style={{ flex: 1, alignItems: 'center', gap: theme.spacing.xs }}>
              <Text variant="label" color="muted">
                Disponible después
              </Text>
              <Money amount={sim.after} size="medium" color={sim.wouldExceed ? 'negative' : 'positive'} />
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
          label="Terminar simulación"
          variant="secondary"
          icon="check"
          fullWidth
          onPress={() => router.back()}
        />
        </> : null}
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
