import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { Icon } from '@/components/common/Icon';
import { PageHeader } from '@/components/common/PageHeader';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { Money } from '@/components/financial/Money';
import { eventsByDay, eventsForMonth, type CalendarEventKind } from '@/engine/calendar';
import { add, formatMoney } from '@/engine/money';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';
import { formatMonthYear, toISODate } from '@/utils/date';

const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const KIND_META: Record<CalendarEventKind, { icon: string; label: string }> = {
  income: { icon: 'arrow-down-left', label: 'Ingreso' },
  bill: { icon: 'receipt', label: 'Servicio' },
  debt: { icon: 'credit-card', label: 'Deuda' },
  subscription: { icon: 'repeat', label: 'Suscripción' },
};

export default function Calendar() {
  const theme = useTheme();
  const router = useRouter();
  const snapshot = useFinancialStore((s) => s.snapshot);
  const currency = snapshot.currentBalance.currency;

  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const events = useMemo(
    () => eventsForMonth(snapshot, cursor.year, cursor.month),
    [snapshot, cursor],
  );
  const byDay = useMemo(() => eventsByDay(events), [events]);

  const move = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const income = events.filter((e) => e.kind === 'income').reduce((acc, e) => add(acc, e.amount), { minor: 0, currency });
  const outflow = events.filter((e) => e.kind !== 'income').reduce((acc, e) => add(acc, e.amount), { minor: 0, currency });

  const days = [...byDay.keys()].sort((a, b) => a - b);
  const monthLabel = formatMonthYear(toISODate(new Date(cursor.year, cursor.month, 1)));
  const isCurrentMonth = cursor.year === today.getFullYear() && cursor.month === today.getMonth();

  return (
    <Screen edges={{ top: true }}>
      <View style={{ padding: theme.spacing.xl }}><PageHeader title="Calendario de pagos" subtitle="Lo que entra y sale este mes, día por día" onBack={() => router.back()} /></View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: 0, gap: theme.spacing.lg }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <Pressable onPress={() => move(-1)} accessibilityRole="button" accessibilityLabel="Mes anterior" hitSlop={10} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevron-left" size={26} color="secondary" />
        </Pressable>
        <Text variant="title" center style={{ flex: 1 }}>{monthLabel}</Text>
        <Pressable onPress={() => move(1)} accessibilityRole="button" accessibilityLabel="Mes siguiente" hitSlop={10} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevron-right" size={26} color="secondary" />
        </Pressable>
      </View>
        <Card variant="highlight">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ gap: theme.spacing.xxs }}>
              <Text variant="label" color="muted">Entra</Text>
              <Money amount={income} size="medium" color="positive" showDecimals={false} />
            </View>
            <View style={{ gap: theme.spacing.xxs, alignItems: 'flex-end' }}>
              <Text variant="label" color="muted">Sale</Text>
              <Money amount={outflow} size="medium" showDecimals={false} />
            </View>
          </View>
        </Card>

        {days.length === 0 ? (
          <EmptyState
            title="Un mes tranquilo"
            body="No hay ingresos ni pagos programados en este mes. Agrega suscripciones, deudas o ingresos para verlos aquí."
            mood="sleeping"
          />
        ) : (
          <View style={{ gap: theme.spacing.md }}>
            {days.map((day) => {
              const list = byDay.get(day) ?? [];
              const date = new Date(cursor.year, cursor.month, day);
              const isToday = isCurrentMonth && day === today.getDate();
              return (
                <Card key={day} padded={false}>
                  <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: theme.radius.md,
                          backgroundColor: isToday ? theme.colors.brand.soft : theme.colors.surface.interactive,
                          borderWidth: isToday ? 1 : 0,
                          borderColor: theme.colors.border.active,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text variant="bodyStrong" color={isToday ? 'brand' : 'primary'}>{day}</Text>
                      </View>
                      <Text variant="caption" color="muted" style={{ flex: 1, textTransform: 'capitalize' }}>
                        {WEEKDAYS_SHORT[date.getDay()]}
                      </Text>
                    </View>
                    <View style={{ gap: theme.spacing.sm }}>
                      {list.map((e, i) => (
                        <View key={`${e.kind}-${e.label}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                          <Icon name={KIND_META[e.kind].icon} size={16} color={e.kind === 'income' ? 'positive' : 'muted'} />
                          <Text variant="body" color="secondary" style={{ flex: 1 }} numberOfLines={1}>
                            {e.label}
                          </Text>
                          <Text variant="bodyStrong" color={e.kind === 'income' ? 'positive' : 'primary'}>
                            {e.kind === 'income' ? '+' : '−'}
                            {formatMoney(e.amount, { withSymbol: false })}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, justifyContent: 'center' }}>
          {(Object.keys(KIND_META) as CalendarEventKind[]).map((k) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              <Icon name={KIND_META[k].icon} size={14} color={k === 'income' ? 'positive' : 'muted'} />
              <Text variant="caption" color="muted">{KIND_META[k].label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
