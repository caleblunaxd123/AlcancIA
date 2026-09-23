import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { HeaderIconButton, PageHeader } from '@/components/common/PageHeader';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Text } from '@/components/common/Text';
import { formatMoney, money } from '@/engine/money';
import { GROUP_KINDS, kindMeta, summarizeGroup } from '@/features/shared/summary';
import { useSharedStore } from '@/store/sharedStore';
import { useTheme } from '@/theme';

const HOW_IT_WORKS = [
  { icon: 'users', title: 'Crea un grupo', body: 'Tu pareja, tu familia, tus roommates o un viaje.' },
  { icon: 'receipt', title: 'Anota quién pagó', body: 'Divide en partes iguales, según ingresos o a tu medida.' },
  { icon: 'scale', title: 'Cuentas claras', body: 'AlcancIA te dice quién le debe a quién, al céntimo.' },
];

/**
 * "Compartidos": real shared-expense groups (local-first). Replaces the old
 * family preview that showed example people and did nothing.
 */
export default function Compartidos() {
  const theme = useTheme();
  const router = useRouter();
  const groups = useSharedStore((s) => s.groups);
  const expenses = useSharedStore((s) => s.expenses);
  const settlements = useSharedStore((s) => s.settlements);

  const summaries = useMemo(
    () => groups.map((g) => ({ group: g, summary: summarizeGroup(g, expenses, settlements) })),
    [groups, expenses, settlements],
  );
  const owedToMe = summaries.reduce((a, x) => a + Math.max(0, x.summary.myBalanceMinor), 0);
  const iOwe = summaries.reduce((a, x) => a + Math.max(0, -x.summary.myBalanceMinor), 0);

  const newGroup = (kind?: string) =>
    router.push(kind ? { pathname: '/compartidos/nuevo', params: { kind } } : '/compartidos/nuevo');

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.huge, gap: theme.spacing.xl }} showsVerticalScrollIndicator={false}>
        <PageHeader
          title="Gastos compartidos"
          subtitle="Divide cuentas con tu pareja, familia o amigos"
          icon="split"
          action={groups.length > 0 ? <HeaderIconButton icon="plus" label="Crear grupo" color="brand" onPress={() => newGroup()} /> : undefined}
        />

        {groups.length === 0 ? (
          <>
            <Card>
              <Text variant="subtitle" style={{ marginBottom: theme.spacing.lg }}>¿Cómo funciona?</Text>
              <View style={{ gap: theme.spacing.lg }}>
                {HOW_IT_WORKS.map((step, i) => (
                  <View key={step.title} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
                      <Text variant="bodyStrong" color="brand">{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong">{step.title}</Text>
                      <Text variant="caption" color="secondary">{step.body}</Text>
                    </View>
                    <Icon name={step.icon} size={20} color="muted" />
                  </View>
                ))}
              </View>
            </Card>

            <View>
              <SectionHeader title="Empieza con un grupo" subtitle="Elige el que más se parece al tuyo" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
                {GROUP_KINDS.map((k, i) => (
                  <Animated.View
                    key={k.kind}
                    entering={theme.reducedMotion ? undefined : FadeInDown.delay(i * theme.staggerStep).duration(theme.motion.normal)}
                    style={{ width: '47.5%' }}
                  >
                    <Pressable
                      onPress={() => newGroup(k.kind)}
                      accessibilityRole="button"
                      accessibilityLabel={`Crear grupo: ${k.label}`}
                      accessibilityHint={k.example}
                      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                    >
                      <Card style={{ height: 150 }}>
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.brand.soft, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.md }}>
                          <Icon name={k.icon} size={22} color="brand" />
                        </View>
                        <Text variant="bodyStrong">{k.label}</Text>
                        <Text variant="caption" color="secondary" numberOfLines={2}>{k.example}</Text>
                      </Card>
                    </Pressable>
                  </Animated.View>
                ))}
              </View>
            </View>

            <PrivacyNote />
          </>
        ) : (
          <>
            {/* Totals across all groups */}
            <Card variant="highlight">
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="caption" color="secondary">Te deben</Text>
                  <Text variant="moneyMedium" color="positive">{formatMoney(money(owedToMe), { hideDecimalsWhenRound: true })}</Text>
                </View>
                <View style={{ width: 1, backgroundColor: theme.colors.border.subtle, marginHorizontal: theme.spacing.md }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="caption" color="secondary">Debes</Text>
                  <Text variant="moneyMedium" color={iOwe > 0 ? 'warning' : 'primary'}>{formatMoney(money(iOwe), { hideDecimalsWhenRound: true })}</Text>
                </View>
              </View>
            </Card>

            <View style={{ gap: theme.spacing.md }}>
              <SectionHeader title="Mis grupos" subtitle="Toca un grupo para añadir un gasto o saldar cuentas" />
              {summaries.map(({ group, summary }) => {
                const meta = kindMeta(group.kind);
                const bal = summary.myBalanceMinor;
                const status =
                  bal > 0
                    ? { text: `Te deben ${formatMoney(money(bal))}`, color: 'positive' as const, icon: 'arrow-down-left' }
                    : bal < 0
                      ? { text: `Debes ${formatMoney(money(-bal))}`, color: 'warning' as const, icon: 'arrow-up-right' }
                      : { text: summary.expenses.length ? 'Están a mano' : 'Sin gastos todavía', color: 'secondary' as const, icon: 'check' };
                return (
                  <Pressable
                    key={group.id}
                    onPress={() => router.push({ pathname: '/compartidos/[id]', params: { id: group.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`${group.name}, ${group.members.length} personas. ${status.text}`}
                    style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                  >
                    <Card>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                        <View style={{ width: 48, height: 48, borderRadius: theme.radius.md, backgroundColor: theme.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name={meta.icon} size={22} color="brand" />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text variant="bodyStrong" numberOfLines={1}>{group.name}</Text>
                          <Text variant="caption" color="secondary" numberOfLines={1}>
                            {group.members.map((m) => (m.isMe ? 'Tú' : m.name)).join(', ')}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Icon name={status.icon} size={13} color={status.color} />
                            <Text variant="caption" color={status.color} style={{ fontWeight: '600' }}>{status.text}</Text>
                          </View>
                        </View>
                        <Icon name="chevron-right" size={20} color="muted" />
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
            </View>

            <Button label="Crear otro grupo" variant="secondary" icon="plus" fullWidth onPress={() => newGroup()} />
            <PrivacyNote />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function PrivacyNote() {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.xs }}>
      <Icon name="lock" size={15} color="muted" />
      <Text variant="caption" color="muted" style={{ flex: 1 }}>
        Tus grupos viven en tu celular. Solo cuenta lo que tú agregas a cada grupo: tus movimientos personales siguen siendo privados.
      </Text>
    </View>
  );
}
