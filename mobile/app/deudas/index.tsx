import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { Icon } from '@/components/common/Icon';
import { PageHeader } from '@/components/common/PageHeader';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { Money } from '@/components/financial/Money';
import { DEBT_KIND_ICONS, DEBT_KIND_LABELS } from '@/constants/debts';
import { payoffForDebt } from '@/engine/debts';
import { add, formatMoney } from '@/engine/money';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';

export default function Debts() {
  const theme = useTheme();
  const router = useRouter();
  const debts = useFinancialStore((s) => s.snapshot.debts);
  const currency = useFinancialStore((s) => s.snapshot.currentBalance.currency);

  const totalBalance = debts.reduce((acc, d) => add(acc, d.balance), { minor: 0, currency });
  const monthlyMinimum = debts.reduce((acc, d) => add(acc, d.minimumPayment), { minor: 0, currency });

  return (
    <Screen edges={{ top: true }}>
      <Header onBack={() => router.back()} onAdd={() => router.push('/deudas/nueva')} />

      {debts.length === 0 ? (
        <EmptyState
          title="Sin deudas registradas"
          body="Si tienes tarjetas o préstamos, regístralos para ver tu camino para salir y cuánto interés pagas."
          actionLabel="Agregar deuda"
          onAction={() => router.push('/deudas/nueva')}
          mood="neutral"
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: 0, gap: theme.spacing.lg }}
          showsVerticalScrollIndicator={false}
        >
          <Card variant="highlight">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ gap: theme.spacing.xxs }}>
                <Text variant="label" color="muted">Saldo total</Text>
                <Money amount={totalBalance} size="medium" />
              </View>
              <View style={{ gap: theme.spacing.xxs, alignItems: 'flex-end' }}>
                <Text variant="label" color="muted">Cuotas al mes</Text>
                <Money amount={monthlyMinimum} size="medium" color="brand" showDecimals={false} />
              </View>
            </View>
          </Card>

          <View style={{ gap: theme.spacing.md }}>
            {debts.map((d) => {
              const payoff = payoffForDebt(d);
              return (
                <Pressable
                  key={d.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver ${d.name}`}
                  onPress={() => router.push({ pathname: '/deudas/[id]', params: { id: d.id } })}
                >
                  <Card variant="interactive">
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                      <View style={{ width: 44, height: 44, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface.interactive, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={DEBT_KIND_ICONS[d.kind]} size={20} color="secondary" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="h3">{d.name}</Text>
                        <Text variant="caption" color="muted">
                          {DEBT_KIND_LABELS[d.kind]} · cuota {formatMoney(d.minimumPayment, { withSymbol: false })} el día {d.dueDay}
                        </Text>
                        <Text variant="caption" color={payoff.months == null ? 'warning' : 'muted'} style={{ marginTop: theme.spacing.xxs }}>
                          {payoff.months == null
                            ? 'Pagando el mínimo no se reduce'
                            : payoff.months === 0
                              ? 'Liquidada'
                              : `~${payoff.months} meses pagando el mínimo`}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: theme.spacing.xxs }}>
                        <Money amount={d.balance} size="small" />
                        <Icon name="chevron-right" size={18} color="muted" />
                      </View>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>

          <Button label="Agregar deuda" variant="secondary" icon="plus" fullWidth onPress={() => router.push('/deudas/nueva')} />
        </ScrollView>
      )}
    </Screen>
  );
}

function Header({ onBack, onAdd }: { onBack: () => void; onAdd: () => void }) {
  const theme = useTheme();
  return (
    <View style={{ padding: theme.spacing.xl }}><PageHeader title="Mis deudas" subtitle="Cuánto debes y cuándo terminarás de pagar" onBack={onBack} action={<Pressable
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel="Agregar deuda"
        hitSlop={8}
        style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.brand.soft, borderWidth: 1, borderColor: theme.colors.border.active }}
      >
        <Icon name="plus" size={22} color="brand" />
      </Pressable>} /></View>
  );
}
