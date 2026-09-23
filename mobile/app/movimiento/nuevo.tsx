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
import { CATEGORIES } from '@/constants/categories';
import { fromMajor } from '@/engine/money';
import { useAppStore } from '@/store/appStore';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';
import type { CategoryId, Transaction, TransactionKind } from '@/types/domain';
import { toISODate } from '@/utils/date';
import { createId } from '@/utils/id';
import { isISODateInput, parseMoneyInput } from '@/utils/validation';

const EXPENSE_CATEGORIES: CategoryId[] = [
  'food', 'delivery', 'transport', 'housing', 'services', 'health',
  'entertainment', 'shopping', 'subscriptions', 'debt', 'pets', 'other',
];
const INCOME_CATEGORIES: CategoryId[] = ['salary', 'transfer', 'other'];

export default function NewTransaction() {
  const theme = useTheme();
  const router = useRouter();
  const { id, kind: kindParam } = useLocalSearchParams<{ id?: string; kind?: string }>();
  const existing = useFinancialStore((s) => s.snapshot.transactions.find((item) => item.id === id));
  const addTransaction = useFinancialStore((s) => s.addTransaction);
  const updateTransaction = useFinancialStore((s) => s.updateTransaction);
  const completeStep = useAppStore((s) => s.completeStep);

  // Quick actions open this screen already set to "gasto" or "ingreso".
  const initialKind: TransactionKind = existing?.kind ?? (kindParam === 'income' ? 'income' : 'expense');
  const [kind, setKind] = useState<TransactionKind>(initialKind);
  const [amount, setAmount] = useState(existing ? String(existing.amount.minor / 100) : '');
  const [category, setCategory] = useState<CategoryId>(existing?.category ?? (initialKind === 'income' ? 'salary' : 'food'));
  const [description, setDescription] = useState(existing?.description ?? '');
  const [date, setDate] = useState(existing?.date ?? toISODate(new Date()));

  const amountValue = parseMoneyInput(amount);
  const canSave = amountValue !== null && isISODateInput(date);
  const categories = kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const save = () => {
    if (!canSave) return;
    const payload: Transaction = {
      id: existing?.id ?? createId('t'),
      kind,
      amount: fromMajor(amountValue!),
      category,
      description: description.trim() || CATEGORIES[category].label,
      date,
      certainty: 'real',
      source: 'manual', operation: 'manual',
    };
    const result = existing ? updateTransaction(existing.id, payload) : addTransaction(payload);
    if (!result.ok) {
      Alert.alert('No se pudo guardar', result.error);
      return;
    }
    if (!existing) completeStep('transaction');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <Screen edges={{ top: true, bottom: true }}>
      <View style={{ padding: theme.spacing.xl }}><PageHeader eyebrow={existing ? 'Ajuste preciso' : 'Registro rápido'} title={existing ? 'Editar movimiento' : 'Registrar movimiento'} subtitle={existing ? 'El saldo se recalculará automáticamente' : 'Añádelo en menos de un minuto'} icon="receipt-text" action={<HeaderIconButton icon="x" label="Cerrar" onPress={() => router.back()} />} /></View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: 0, gap: theme.spacing.xl }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Type toggle */}
        <View style={{ flexDirection: 'row', backgroundColor: theme.colors.surface.interactive, borderRadius: theme.radius.pill, padding: 4 }}>
          {(['expense', 'income'] as const).map((k) => {
            const active = kind === k;
            return (
              <Pressable
                key={k}
                onPress={() => { setKind(k); setCategory(k === 'expense' ? 'food' : 'salary'); Haptics.selectionAsync().catch(() => {}); }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{ flex: 1, alignItems: 'center', paddingVertical: theme.spacing.md, borderRadius: theme.radius.pill, backgroundColor: active ? theme.colors.brand.primary : 'transparent' }}
              >
                <Text variant="bodyStrong" color={active ? 'onBrand' : 'secondary'}>
                  {k === 'expense' ? 'Gasto' : 'Ingreso'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextField label="Monto" prefix="S/" placeholder="0.00" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} autoFocus />

        <View style={{ gap: theme.spacing.md }}>
          <Text variant="label" color="muted">Categoría</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {categories.map((id) => {
              const c = CATEGORIES[id];
              const active = category === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => { setCategory(id); Haptics.selectionAsync().catch(() => {}); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: active ? theme.colors.brand.primary : theme.colors.border.subtle, backgroundColor: active ? theme.colors.brand.soft : theme.colors.surface.primary }}
                >
                  <Icon name={c.icon} size={16} color={active ? 'brand' : 'secondary'} />
                  <Text variant="caption" color={active ? 'brand' : 'secondary'}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TextField label="Descripción (opcional)" placeholder="¿En qué fue?" value={description} onChangeText={setDescription} />
        <TextField
          label="Fecha"
          placeholder="AAAA-MM-DD"
          value={date}
          onChangeText={setDate}
          keyboardType="numbers-and-punctuation"
          error={date.length === 10 && !isISODateInput(date) ? 'Usa una fecha válida en formato AAAA-MM-DD.' : undefined}
        />

        <Button label={existing ? 'Guardar cambios' : 'Guardar movimiento'} size="lg" fullWidth icon="check" disabled={!canSave} onPress={save} />
      </ScrollView>
    </Screen>
  );
}
