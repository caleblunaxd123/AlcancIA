import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { CATEGORIES } from '@/constants/categories';
import { fromMajor } from '@/engine/money';
import { useAppStore } from '@/store/appStore';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';
import type { CategoryId, TransactionKind } from '@/types/domain';
import { toISODate } from '@/utils/date';

const EXPENSE_CATEGORIES: CategoryId[] = [
  'food', 'delivery', 'transport', 'housing', 'services', 'health',
  'entertainment', 'shopping', 'subscriptions', 'debt', 'pets', 'other',
];
const INCOME_CATEGORIES: CategoryId[] = ['salary', 'transfer', 'other'];

export default function NewTransaction() {
  const theme = useTheme();
  const router = useRouter();
  const addTransaction = useFinancialStore((s) => s.addTransaction);
  const completeStep = useAppStore((s) => s.completeStep);

  const [kind, setKind] = useState<TransactionKind>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CategoryId>('food');
  const [description, setDescription] = useState('');

  const amountValue = parseFloat(amount.replace(',', '.')) || 0;
  const canSave = amountValue > 0;
  const categories = kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const save = () => {
    if (!canSave) return;
    addTransaction({
      id: `t-${Date.now()}`,
      kind,
      amount: fromMajor(amountValue),
      category,
      description: description.trim() || CATEGORIES[category].label,
      date: toISODate(new Date()),
      certainty: 'real',
      source: 'manual',
    });
    completeStep('transaction');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <Screen edges={{ top: true, bottom: true }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.xl }}>
        <Text variant="title">Nuevo movimiento</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={10}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface.primary }}>
          <Icon name="x" size={22} color="secondary" />
        </Pressable>
      </View>

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

        <Button label="Guardar movimiento" size="lg" fullWidth icon="check" disabled={!canSave} onPress={save} />
      </ScrollView>
    </Screen>
  );
}
