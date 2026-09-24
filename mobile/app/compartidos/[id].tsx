import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { HeaderIconButton, PageHeader } from '@/components/common/PageHeader';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Text } from '@/components/common/Text';
import { formatMoney, money } from '@/engine/money';
import { kindMeta, summarizeGroup } from '@/features/shared/summary';
import { useSharedStore } from '@/store/sharedStore';
import { useTheme } from '@/theme';
import { formatDayMonth, toISODate } from '@/utils/date';

export default function GroupDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useSharedStore((s) => s.groups.find((g) => g.id === id));
  const expenses = useSharedStore((s) => s.expenses);
  const settlements = useSharedStore((s) => s.settlements);
  const addSettlement = useSharedStore((s) => s.addSettlement);
  const deleteExpense = useSharedStore((s) => s.deleteExpense);
  const deleteGroup = useSharedStore((s) => s.deleteGroup);

  const summary = useMemo(() => (group ? summarizeGroup(group, expenses, settlements) : null), [group, expenses, settlements]);

  if (!group || !summary) {
    return (
      <Screen>
        <View style={{ padding: theme.spacing.xl }}>
          <PageHeader title="Grupo no encontrado" onBack={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const nameOf = (memberId: string) => {
    const m = group.members.find((x) => x.id === memberId);
    return m ? (m.isMe ? 'Tú' : m.name) : 'Alguien';
  };
  const bal = summary.myBalanceMinor;
  const meta = kindMeta(group.kind);

  const settle = (from: string, to: string, amountMinor: number) => {
    const fromName = nameOf(from);
    const toName = nameOf(to);
    Alert.alert(
      'Registrar pago',
      `${fromName} ${fromName === 'Tú' ? 'pagaste' : 'pagó'} ${formatMoney(money(amountMinor))} a ${toName === 'Tú' ? 'ti' : toName}. ¿Lo registramos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, registrar',
          onPress: () => {
            const r = addSettlement({ groupId: group.id, from, to, amount: money(amountMinor), date: toISODate(new Date()) });
            if (!r.ok) Alert.alert('No se pudo registrar', r.error);
            else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          },
        },
      ],
    );
  };

  const confirmDeleteGroup = () =>
    Alert.alert('Eliminar grupo', `Se borrarán "${group.name}" y todos sus gastos. Esto no afecta tus movimientos personales.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { deleteGroup(group.id); router.back(); } },
    ]);

  const confirmDeleteExpense = (expenseId: string, description: string) =>
    Alert.alert('Eliminar gasto', `¿Eliminar "${description}"? Las cuentas del grupo se recalculan.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteExpense(expenseId) },
    ]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.huge, gap: theme.spacing.xl }} showsVerticalScrollIndicator={false}>
        <PageHeader
          title={group.name}
          subtitle={`${meta.label} · ${group.members.map((m) => (m.isMe ? 'Tú' : m.name)).join(', ')}`}
          onBack={() => router.back()}
          action={<HeaderIconButton icon="trash-2" label="Eliminar grupo" color="muted" onPress={confirmDeleteGroup} />}
        />

        {/* Status */}
        <Card variant={bal === 0 ? 'default' : 'highlight'}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={bal > 0 ? 'arrow-down-left' : bal < 0 ? 'arrow-up-right' : 'check-check'} size={22} color={bal > 0 ? 'positive' : bal < 0 ? 'warning' : 'brand'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="secondary">
                {bal > 0 ? 'En este grupo te deben' : bal < 0 ? 'En este grupo debes' : summary.expenses.length ? 'Todo en orden' : 'Aún no hay gastos'}
              </Text>
              <Text variant="moneyMedium" color={bal > 0 ? 'positive' : bal < 0 ? 'warning' : 'primary'}>
                {bal === 0 ? (summary.expenses.length ? 'Están a mano 🎉' : 'S/ 0') : formatMoney(money(Math.abs(bal)))}
              </Text>
            </View>
          </View>
          <Text variant="caption" color="secondary" style={{ marginTop: theme.spacing.md }}>
            Gastado en total: {formatMoney(money(summary.totalSpentMinor), { hideDecimalsWhenRound: true })} · {summary.expenses.length} gasto{summary.expenses.length === 1 ? '' : 's'}
          </Text>
        </Card>

        <Button
          label="Añadir un gasto"
          size="lg"
          fullWidth
          icon="plus"
          onPress={() => router.push({ pathname: '/compartidos/gasto', params: { groupId: group.id } })}
        />

        {/* Settle up */}
        {summary.transfers.length > 0 ? (
          <View>
            <SectionHeader title="Para quedar a mano" subtitle="Toca «Pagado» cuando alguien devuelva el dinero" />
            <Card padded={false}>
              {summary.transfers.map((t, i) => (
                <View
                  key={`${t.from}-${t.to}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.lg, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.colors.border.subtle }}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">
                      {nameOf(t.from)} → {nameOf(t.to)}
                    </Text>
                    <Text variant="caption" color="secondary">
                      {nameOf(t.from) === 'Tú' ? 'Le debes' : `${nameOf(t.from)} debe`} {formatMoney(money(t.amountMinor))}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => settle(t.from, t.to, t.amountMinor)}
                    accessibilityRole="button"
                    accessibilityLabel={`Marcar como pagado: ${nameOf(t.from)} a ${nameOf(t.to)}, ${formatMoney(money(t.amountMinor))}`}
                    style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: theme.spacing.lg, borderRadius: theme.radius.pill, justifyContent: 'center', backgroundColor: theme.colors.brand.soft, opacity: pressed ? 0.7 : 1 })}
                  >
                    <Text variant="bodyStrong" color="brand" style={{ fontSize: 14 }}>Pagado</Text>
                  </Pressable>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {/* Expenses */}
        <View>
          <SectionHeader title="Gastos del grupo" />
          {summary.expenses.length === 0 ? (
            <EmptyState
              title="Todavía no hay gastos"
              body="Anota la primera cuenta: quién pagó y cómo la dividen. AlcancIA hace el resto."
              mood="happy"
            />
          ) : (
            <Card padded={false}>
              {summary.expenses.map((e, i) => {
                const myShare = e.shares.find((s) => s.memberId === summary.me?.id)?.amountMinor ?? 0;
                return (
                  <View
                    key={e.id}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.lg, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.colors.border.subtle }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" numberOfLines={1}>{e.description}</Text>
                      <Text variant="caption" color="secondary" numberOfLines={1}>
                        {formatDayMonth(e.date)} · {nameOf(e.paidBy) === 'Tú' ? 'Pagaste tú' : `Pagó ${nameOf(e.paidBy)}`}
                      </Text>
                      <Text variant="caption" color="muted" numberOfLines={1}>Tu parte: {formatMoney(money(myShare))}</Text>
                    </View>
                    <Text variant="moneySmall">{formatMoney(e.amount, { hideDecimalsWhenRound: true })}</Text>
                    <Pressable onPress={() => confirmDeleteExpense(e.id, e.description)} accessibilityRole="button" accessibilityLabel={`Eliminar ${e.description}`} hitSlop={10}>
                      <Icon name="trash-2" size={17} color="muted" />
                    </Pressable>
                  </View>
                );
              })}
            </Card>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
