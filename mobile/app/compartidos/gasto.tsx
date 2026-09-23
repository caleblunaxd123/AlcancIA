import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { HeaderIconButton, PageHeader } from '@/components/common/PageHeader';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { CATEGORIES } from '@/constants/categories';
import { formatMoney, fromMajor, money } from '@/engine/money';
import { sharesMatchTotal, splitExpense } from '@/engine/split';
import { useFinancialStore } from '@/store/financialStore';
import { useSharedStore } from '@/store/sharedStore';
import { useTheme } from '@/theme';
import type { CategoryId } from '@/types/domain';
import type { ExpenseShare, SplitMode } from '@/types/shared';
import { toISODate } from '@/utils/date';
import { createId } from '@/utils/id';
import { parseMoneyInput } from '@/utils/validation';

const PERSONAL_CATEGORIES: CategoryId[] = ['food', 'housing', 'services', 'transport', 'entertainment', 'shopping', 'other'];

export default function NewSharedExpense() {
  const theme = useTheme();
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const group = useSharedStore((s) => s.groups.find((g) => g.id === groupId));
  const addExpense = useSharedStore((s) => s.addExpense);
  const addTransaction = useFinancialStore((s) => s.addTransaction);

  const me = group?.members.find((m) => m.isMe);
  const hasIncomes = Boolean(group?.members.some((m) => (m.incomeMinor ?? 0) > 0));

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(me?.id ?? '');
  const [mode, setMode] = useState<SplitMode>('equal');
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [recordMine, setRecordMine] = useState(true);
  const [category, setCategory] = useState<CategoryId>('food');

  const amountMajor = parseMoneyInput(amount);
  const totalMinor = amountMajor !== null ? fromMajor(amountMajor).minor : 0;

  const shares: ExpenseShare[] = useMemo(() => {
    if (!group || totalMinor <= 0) return [];
    if (mode === 'custom') {
      return group.members.map((m) => {
        const v = parseMoneyInput(custom[m.id] ?? '');
        return { memberId: m.id, amountMinor: v === null ? 0 : fromMajor(v).minor };
      });
    }
    return splitExpense(totalMinor, group.members, mode);
  }, [group, totalMinor, mode, custom]);

  if (!group || !me) {
    return (
      <Screen>
        <View style={{ padding: theme.spacing.xl }}>
          <PageHeader title="Grupo no encontrado" onBack={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const assigned = shares.reduce((a, s) => a + s.amountMinor, 0);
  const remaining = totalMinor - assigned;
  const valid = description.trim().length > 0 && totalMinor > 0 && paidBy && sharesMatchTotal(shares, totalMinor);
  const myShare = shares.find((s) => s.memberId === me.id)?.amountMinor ?? 0;

  const save = () => {
    if (!valid) return;
    const date = toISODate(new Date());
    const result = addExpense({ groupId: group.id, description, amount: money(totalMinor), paidBy, mode, shares, date });
    if (!result.ok) {
      Alert.alert('No se pudo guardar', result.error);
      return;
    }
    // Only MY share is my real cost — that's what reaches personal finances.
    if (recordMine && myShare > 0) {
      const tx = addTransaction({
        id: createId('t'),
        kind: 'expense',
        amount: money(myShare),
        category,
        description: `${description.trim()} (${group.name})`,
        date,
        certainty: 'real',
        source: 'manual',
      });
      if (!tx.ok) Alert.alert('Gasto compartido guardado', `Pero no pudimos registrar tu parte en Movimientos: ${tx.error}`);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  const MODES: { value: SplitMode; label: string; disabled?: boolean }[] = [
    { value: 'equal', label: 'Iguales' },
    { value: 'proportional', label: 'Según ingresos', disabled: !hasIncomes },
    { value: 'custom', label: 'A mi medida' },
  ];

  return (
    <Screen edges={{ top: true, bottom: true }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ padding: theme.spacing.xl }}>
          <PageHeader
            title="Gasto compartido"
            subtitle={group.name}
            action={<HeaderIconButton icon="x" label="Cerrar" onPress={() => router.back()} />}
          />
        </View>

        <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: 0, gap: theme.spacing.xl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TextField label="¿Qué pagaron?" placeholder="Súper, alquiler, cena…" value={description} onChangeText={setDescription} />
          <TextField label="Monto total" prefix="S/" placeholder="0.00" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />

          <View style={{ gap: theme.spacing.md }}>
            <Text variant="bodyStrong">¿Quién pagó?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              {group.members.map((m) => {
                const active = paidBy === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => { setPaidBy(m.id); Haptics.selectionAsync().catch(() => {}); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: theme.spacing.lg, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: active ? theme.colors.brand.primary : theme.colors.border.subtle, backgroundColor: active ? theme.colors.brand.soft : theme.colors.surface.primary }}
                  >
                    <Text variant="bodyStrong" color={active ? 'brand' : 'secondary'} style={{ fontSize: 14 }}>{m.isMe ? 'Yo' : m.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: theme.spacing.md }}>
            <Text variant="bodyStrong">¿Cómo lo dividen?</Text>
            <View style={{ flexDirection: 'row', padding: 4, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface.interactive }}>
              {MODES.map((m) => {
                const active = mode === m.value;
                return (
                  <Pressable
                    key={m.value}
                    disabled={m.disabled}
                    onPress={() => { setMode(m.value); Haptics.selectionAsync().catch(() => {}); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled: m.disabled }}
                    style={{ flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.pill, backgroundColor: active ? theme.colors.surface.primary : 'transparent', opacity: m.disabled ? 0.4 : 1 }}
                  >
                    <Text variant="caption" color={active ? 'brand' : 'secondary'} style={{ fontWeight: '700' }}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {!hasIncomes ? (
              <Text variant="caption" color="muted">«Según ingresos» se activa si agregas ingresos al crear el grupo.</Text>
            ) : null}
          </View>

          {/* Live preview */}
          <Card>
            <Text variant="bodyStrong" style={{ marginBottom: theme.spacing.sm }}>A cada uno le toca</Text>
            {group.members.map((m, i) => {
              const share = shares.find((s) => s.memberId === m.id)?.amountMinor ?? 0;
              return (
                <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.sm, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.colors.border.subtle }}>
                  <Text variant="body" style={{ flex: 1 }}>{m.isMe ? 'Yo' : m.name}</Text>
                  {mode === 'custom' ? (
                    <View style={{ width: 140 }}>
                      <TextField
                        prefix="S/"
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        value={custom[m.id] ?? ''}
                        onChangeText={(v) => setCustom((c) => ({ ...c, [m.id]: v }))}
                        accessibilityLabel={`Parte de ${m.isMe ? 'mí' : m.name}`}
                      />
                    </View>
                  ) : (
                    <Text variant="moneySmall">{formatMoney(money(share))}</Text>
                  )}
                </View>
              );
            })}
            {mode === 'custom' && totalMinor > 0 && remaining !== 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: theme.spacing.sm }}>
                <Icon name="alert-circle" size={14} color="warning" />
                <Text variant="caption" color="warning">
                  {remaining > 0 ? `Faltan ${formatMoney(money(remaining))} por asignar` : `Te pasaste por ${formatMoney(money(-remaining))}`}
                </Text>
              </View>
            ) : null}
          </Card>

          {myShare > 0 ? (
            <View style={{ gap: theme.spacing.md, padding: theme.spacing.lg, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface.secondary }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">Registrar mi parte ({formatMoney(money(myShare))}) en Movimientos</Text>
                  <Text variant="caption" color="secondary">Así tu «Puedes gastar» refleja lo que de verdad te costó.</Text>
                </View>
                <Switch
                  value={recordMine}
                  onValueChange={setRecordMine}
                  accessibilityLabel="Registrar mi parte en Movimientos"
                  trackColor={{ true: theme.colors.brand.primary, false: theme.colors.border.strong }}
                thumbColor={theme.colors.surface.primary}
                />
              </View>
              {recordMine ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                  {PERSONAL_CATEGORIES.map((c) => {
                    const active = category === c;
                    return (
                      <Pressable
                        key={c}
                        onPress={() => setCategory(c)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: active ? theme.colors.brand.primary : theme.colors.border.subtle, backgroundColor: active ? theme.colors.brand.soft : theme.colors.surface.primary }}
                      >
                        <Icon name={CATEGORIES[c].icon} size={14} color={active ? 'brand' : 'secondary'} />
                        <Text variant="caption" color={active ? 'brand' : 'secondary'}>{CATEGORIES[c].label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : null}

          <Button label="Guardar gasto" size="lg" fullWidth icon="check" disabled={!valid} onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
