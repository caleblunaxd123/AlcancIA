import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { Icon } from '@/components/common/Icon';
import { PageHeader } from '@/components/common/PageHeader';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { eventsByDay, eventsForMonth, monthGrid, type CalendarEvent, type CalendarEventKind } from '@/engine/calendar';
import { add, formatMoney, subtract } from '@/engine/money';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';
import { formatMonthYear, toISODate } from '@/utils/date';

const WEEK_HEADER = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const KIND_META: Record<CalendarEventKind, { icon: string; label: string }> = {
  income: { icon: 'arrow-down-left', label: 'Ingreso' },
  bill: { icon: 'receipt', label: 'Pago fijo' },
  debt: { icon: 'credit-card', label: 'Cuota de deuda' },
  subscription: { icon: 'repeat', label: 'Suscripción' },
};

/**
 * A real month calendar: tap a day to see what happens that day. Dots mark
 * money in (green) and out (red); past days are dimmed; today is ringed.
 * Without a selection, the list shows what is still coming this month.
 */
export default function Calendar() {
  const theme = useTheme();
  const router = useRouter();
  const snapshot = useFinancialStore((s) => s.snapshot);
  const currency = snapshot.currentBalance.currency;

  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState<number | null>(null);

  const events = useMemo(() => eventsForMonth(snapshot, cursor.year, cursor.month), [snapshot, cursor]);
  const byDay = useMemo(() => eventsByDay(events), [events]);
  const weeks = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);

  const isCurrentMonth = cursor.year === today.getFullYear() && cursor.month === today.getMonth();
  const isPastMonth = cursor.year < today.getFullYear() || (cursor.year === today.getFullYear() && cursor.month < today.getMonth());
  const isPastDay = (day: number) => isPastMonth || (isCurrentMonth && day < today.getDate());

  const total = (list: CalendarEvent[], kind: 'in' | 'out') =>
    list.filter((e) => (kind === 'in' ? e.kind === 'income' : e.kind !== 'income'))
      .reduce((acc, e) => add(acc, e.amount), { minor: 0, currency });
  const income = total(events, 'in');
  const outflow = total(events, 'out');
  const left = subtract(income, outflow);

  const move = (delta: number) => {
    setSelected(null);
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const pick = (day: number) => {
    Haptics.selectionAsync().catch(() => {});
    setSelected((current) => (current === day ? null : day));
  };

  // What the list below the grid shows.
  const listDays = selected != null
    ? [selected]
    : [...byDay.keys()].filter((d) => !isPastDay(d)).sort((a, b) => a - b);
  const listTitle = selected != null
    ? `${WEEKDAYS[new Date(cursor.year, cursor.month, selected).getDay()]} ${selected}`
    : isPastMonth ? 'Este mes ya pasó' : isCurrentMonth ? 'Lo que viene este mes' : 'Lo que viene';

  const monthLabel = formatMonthYear(toISODate(new Date(cursor.year, cursor.month, 1)));
  const cellSize = 44;

  return (
    <Screen edges={{ top: true }}>
      <View style={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.md }}>
        <PageHeader title="Calendario de pagos" subtitle="Toca un día para ver qué pagas o cobras" onBack={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: 0, gap: theme.spacing.lg }} showsVerticalScrollIndicator={false}>
        {/* Month summary */}
        <Card variant="highlight">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <SummaryFigure label="Entra" value={formatMoney(income, { hideDecimalsWhenRound: true })} color="positive" />
            <SummaryFigure label="Sale" value={formatMoney(outflow, { hideDecimalsWhenRound: true })} color="negative" align="center" />
            <SummaryFigure label="Te queda" value={formatMoney(left, { hideDecimalsWhenRound: true })} color={left.minor < 0 ? 'negative' : 'primary'} align="flex-end" />
          </View>
        </Card>

        {/* Calendar grid */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
            <Pressable onPress={() => move(-1)} accessibilityRole="button" accessibilityLabel="Mes anterior" hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chevron-left" size={24} color="secondary" />
            </Pressable>
            <Text variant="subtitle" center style={{ flex: 1, textTransform: 'capitalize' }}>{monthLabel}</Text>
            <Pressable onPress={() => move(1)} accessibilityRole="button" accessibilityLabel="Mes siguiente" hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chevron-right" size={24} color="secondary" />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', marginBottom: theme.spacing.xs }}>
            {WEEK_HEADER.map((d, i) => (
              <Text key={i} variant="caption" color="muted" center style={{ flex: 1 }}>{d}</Text>
            ))}
          </View>

          {weeks.map((week, w) => (
            <View key={w} style={{ flexDirection: 'row' }}>
              {week.map((day, i) => {
                if (day == null) return <View key={i} style={{ flex: 1, height: cellSize + 10 }} />;
                const list = byDay.get(day) ?? [];
                const hasIn = list.some((e) => e.kind === 'income');
                const hasOut = list.some((e) => e.kind !== 'income');
                const isToday = isCurrentMonth && day === today.getDate();
                const isSelected = selected === day;
                const past = isPastDay(day);
                return (
                  <Pressable
                    key={i}
                    onPress={() => pick(day)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${day}${isToday ? ', hoy' : ''}${list.length ? `, ${list.length} movimiento${list.length > 1 ? 's' : ''}` : ''}`}
                    style={{ flex: 1, height: cellSize + 10, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <View
                      style={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: cellSize / 2,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isSelected ? theme.colors.brand.primary : isToday ? theme.colors.brand.soft : 'transparent',
                        borderWidth: isToday && !isSelected ? 1.5 : 0,
                        borderColor: theme.colors.brand.primary,
                      }}
                    >
                      <Text
                        variant={isToday || isSelected ? 'bodyStrong' : 'body'}
                        color={isSelected ? 'onBrand' : isToday ? 'brand' : past ? 'muted' : 'primary'}
                      >
                        {day}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 3, position: 'absolute', bottom: 5 }}>
                        {hasIn ? <Dot color={isSelected ? theme.colors.text.onBrand : theme.colors.money.positive} faded={past} /> : null}
                        {hasOut ? <Dot color={isSelected ? theme.colors.text.onBrand : theme.colors.money.negative} faded={past} /> : null}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.lg, marginTop: theme.spacing.md }}>
            <Legend color={theme.colors.money.positive} label="Entra dinero" />
            <Legend color={theme.colors.money.negative} label="Sale dinero" />
          </View>
        </Card>

        {/* Day / upcoming list */}
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="subtitle">{capitalize(listTitle)}</Text>
            {selected != null ? (
              <Pressable onPress={() => setSelected(null)} accessibilityRole="button" hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text variant="bodyStrong" color="brand">Ver todo el mes</Text>
              </Pressable>
            ) : null}
          </View>

          {events.length === 0 ? (
            <EmptyState
              title="Un mes tranquilo"
              body="No hay ingresos ni pagos programados. Agrega suscripciones, deudas o pagos fijos para verlos aquí."
              mood="sleeping"
            />
          ) : listDays.every((d) => (byDay.get(d) ?? []).length === 0) ? (
            <Card>
              <Text variant="body" color="secondary" center>
                {selected != null ? 'Este día no tienes pagos ni cobros.' : 'Ya no quedan pagos este mes. Revisa el mes siguiente con la flecha.'}
              </Text>
            </Card>
          ) : (
            listDays.map((day) => (
              <Card key={day} padded={false}>
                <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
                  {selected == null ? (
                    <Text variant="label" color="muted">
                      {isCurrentMonth && day === today.getDate() ? 'Hoy' : `${WEEKDAYS[new Date(cursor.year, cursor.month, day).getDay()]} ${day}`}
                    </Text>
                  ) : null}
                  {(byDay.get(day) ?? []).map((e, i) => (
                    <View key={`${e.kind}-${e.label}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: e.kind === 'income' ? theme.colors.brand.soft : theme.colors.surface.interactive }}>
                        <Icon name={KIND_META[e.kind].icon} size={18} color={e.kind === 'income' ? 'positive' : 'secondary'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyStrong" numberOfLines={1}>{e.label}</Text>
                        <Text variant="caption" color="muted">{KIND_META[e.kind].label}{isPastDay(day) ? ' · ya pasó' : ''}</Text>
                      </View>
                      <Text variant="bodyStrong" color={e.kind === 'income' ? 'positive' : 'primary'}>
                        {e.kind === 'income' ? '+' : '−'}{formatMoney(e.amount, { hideDecimalsWhenRound: true })}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function SummaryFigure({ label, value, color, align = 'flex-start' }: { label: string; value: string; color: 'positive' | 'negative' | 'primary'; align?: 'flex-start' | 'center' | 'flex-end' }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.xxs, alignItems: align }}>
      <Text variant="label" color="muted">{label}</Text>
      <Text variant="bodyStrong" color={color} style={{ fontSize: 17 }}>{value}</Text>
    </View>
  );
}

function Dot({ color, faded }: { color: string; faded?: boolean }) {
  return <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity: faded ? 0.4 : 1 }} />;
}

function Legend({ color, label }: { color: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
      <Dot color={color} />
      <Text variant="caption" color="muted">{label}</Text>
    </View>
  );
}
