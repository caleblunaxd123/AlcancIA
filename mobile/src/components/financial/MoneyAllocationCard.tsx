import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BottomSheet } from '@/components/common/BottomSheet';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { formatMoney, money } from '@/engine/money';
import type { AllocationLine, AllocationResult, AllocationSlice, AllocationSliceId } from '@/engine/allocation';
import type { CurrencyCode } from '@/types/money';
import { useTheme, type ColorTokens } from '@/theme';

const zeroMoney = (currency: CurrencyCode) => money(0, currency);

type SliceMeta = {
  id: AllocationSliceId;
  label: string;
  icon: string;
  color: (c: ColorTokens) => string;
  hint: string;
};

const SLICES: SliceMeta[] = [
  { id: 'obligations', label: 'Obligaciones', icon: 'receipt', color: (c) => c.status.warning, hint: 'Pagos fijos, cuotas y suscripciones' },
  { id: 'savings', label: 'Ahorro', icon: 'piggy-bank', color: (c) => c.status.info, hint: 'Aportes comprometidos a tus metas' },
  { id: 'spending', label: 'Gastos', icon: 'shopping-bag', color: (c) => c.brand.accent, hint: 'Lo que ya gastaste este mes' },
  { id: 'free', label: 'Libre', icon: 'sparkles', color: (c) => c.money.positive, hint: 'Lo que te queda para decidir' },
];

export type MoneyAllocationCardProps = {
  result: AllocationResult;
  onAddIncome?: () => void;
};

/**
 * "Tu dinero este mes" — the visual division of income (§ UX banca). Each
 * segment pairs color with icon + label so meaning never relies on color
 * alone (§16), and the explainer sheet itemizes where each figure comes from.
 */
export function MoneyAllocationCard({ result, onAddIncome }: MoneyAllocationCardProps) {
  const theme = useTheme();
  const [showDetail, setShowDetail] = useState(false);

  if (result.incomeUnknown) {
    return (
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <View style={{ width: 44, height: 44, borderRadius: theme.radius.md, backgroundColor: theme.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="pie-chart" size={22} color="brand" />
          </View>
          <View style={{ flex: 1, gap: theme.spacing.xxs }}>
            <Text variant="bodyStrong">Divide tu dinero este mes</Text>
            <Text variant="caption" color="secondary">
              Registra un ingreso y verás aquí cuánto va a obligaciones, ahorro, gastos y cuánto te queda libre.
            </Text>
          </View>
        </View>
        {onAddIncome ? (
          <View style={{ marginTop: theme.spacing.lg }}>
            <Button label="Registrar mi ingreso" icon="plus" variant="secondary" fullWidth onPress={onAddIncome} />
          </View>
        ) : null}
      </Card>
    );
  }

  const byId = new Map(result.slices.map((s) => [s.id, s]));
  const visible = SLICES.filter((meta) => (byId.get(meta.id)?.share ?? 0) > 0);

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          <Icon name="pie-chart" size={16} color="brand" />
          <Text variant="label" color="brand">Tu dinero este mes</Text>
        </View>
        <Pressable
          onPress={() => setShowDetail(true)}
          accessibilityRole="button"
          accessibilityLabel="¿Cómo lo calculamos?"
          hitSlop={8}
          style={{ minHeight: 32, justifyContent: 'center' }}
        >
          <Text variant="caption" color="muted">Ver detalle</Text>
        </Pressable>
      </View>

      <Text variant="caption" color="secondary" style={{ marginBottom: theme.spacing.md }}>
        De tu ingreso mensual de {formatMoney(result.income, { hideDecimalsWhenRound: true })}
      </Text>

      {/* Segmented bar */}
      <View
        style={{ flexDirection: 'row', height: 14, borderRadius: theme.radius.pill, overflow: 'hidden', backgroundColor: theme.colors.surface.interactive, gap: 2 }}
        accessible
        accessibilityRole="summary"
        accessibilityLabel={SLICES.map((meta) => `${meta.label}: ${Math.round((byId.get(meta.id)?.share ?? 0) * 100)} por ciento`).join(', ')}
      >
        {visible.map((meta) => {
          const share = byId.get(meta.id)?.share ?? 0;
          return (
            <View
              key={meta.id}
              style={{ flex: share, backgroundColor: meta.color(theme.colors), minWidth: share > 0 ? 4 : 0 }}
            />
          );
        })}
      </View>

      {/* Legend rows: icon + label + amount + percent */}
      <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.md }}>
        {SLICES.map((meta) => {
          const slice = byId.get(meta.id);
          const percent = Math.round((slice?.share ?? 0) * 100);
          const isFree = meta.id === 'free';
          return (
            <View key={meta.id} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <View style={{ width: 32, height: 32, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surface.secondary, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={meta.icon} size={17} rawColor={meta.color(theme.colors)} />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text variant="bodyStrong">{meta.label}</Text>
                <Text variant="caption" color="muted">{meta.hint}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant={isFree ? 'moneySmall' : 'bodyStrong'} color={isFree ? 'positive' : 'primary'}>
                  {formatMoney(slice?.amount ?? zeroMoney(result.currency), { hideDecimalsWhenRound: true })}
                </Text>
                <Text variant="caption" color="muted">{percent}%</Text>
              </View>
            </View>
          );
        })}
      </View>

      {result.overspent ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.lg, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface.secondary }}>
          <Icon name="info" size={16} color="secondary" />
          <Text variant="caption" color="secondary" style={{ flex: 1 }}>
            Este mes salió un poco más de lo que entra. Pasa a veces; mirarlo ya es cuidarte.
          </Text>
        </View>
      ) : null}

      <BottomSheet visible={showDetail} onClose={() => setShowDetail(false)} title="¿Cómo lo calculamos?">
        <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.lg }}>
          Tomamos tu ingreso mensual y lo dividimos en cuatro. Cada cifra sale de tus datos reales:
        </Text>

        <DetailGroup title="Obligaciones" icon="receipt" lines={result.obligationLines} total={byId.get('obligations')} currency={result.currency} />
        <DetailGroup title="Ahorro" icon="piggy-bank" lines={result.savingsLines} total={byId.get('savings')} currency={result.currency} />

        <DetailRow
          label="Gastos del mes"
          hint="Movimientos reales que registraste (sin contar aportes a metas ni pagos de deuda)"
          amount={formatMoney(byId.get('spending')?.amount ?? zeroMoney(result.currency), { hideDecimalsWhenRound: true })}
        />
        <DetailRow
          label="Libre para decidir"
          hint="Ingreso − obligaciones − ahorro − gastos"
          amount={formatMoney(byId.get('free')?.amount ?? zeroMoney(result.currency), { hideDecimalsWhenRound: true })}
          positive
        />
      </BottomSheet>
    </Card>
  );
}

function DetailGroup({ title, icon, lines, total, currency }: {
  title: string;
  icon: string;
  lines: AllocationLine[];
  total?: AllocationSlice;
  currency: CurrencyCode;
}) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          <Icon name={icon} size={15} color="secondary" />
          <Text variant="label" color="muted">{title}</Text>
        </View>
        <Text variant="bodyStrong">{formatMoney(total?.amount ?? { minor: 0, currency }, { hideDecimalsWhenRound: true })}</Text>
      </View>
      {lines.length === 0 ? (
        <Text variant="caption" color="muted">Nada por aquí.</Text>
      ) : (
        lines.map((line, i) => (
          <DetailRow key={`${line.label}-${i}`} label={line.label} amount={formatMoney(line.amount, { hideDecimalsWhenRound: true })} subtle />
        ))
      )}
    </View>
  );
}

function DetailRow({ label, hint, amount, positive, subtle }: { label: string; hint?: string; amount: string; positive?: boolean; subtle?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
        paddingVertical: subtle ? theme.spacing.xs : theme.spacing.sm,
        borderBottomWidth: subtle ? 0 : 1,
        borderBottomColor: theme.colors.border.subtle,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text variant={subtle ? 'caption' : 'bodyStrong'} color={subtle ? 'secondary' : 'primary'}>{label}</Text>
        {hint ? <Text variant="caption" color="muted">{hint}</Text> : null}
      </View>
      <Text variant={subtle ? 'caption' : 'moneySmall'} color={positive ? 'positive' : subtle ? 'secondary' : 'primary'}>
        {amount}
      </Text>
    </View>
  );
}
