import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { Icon } from '@/components/common/Icon';
import { PageHeader } from '@/components/common/PageHeader';
import { Money } from '@/components/financial/Money';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { formatMoney } from '@/engine/money';
import { subscriptionTotals } from '@/engine/subscriptions';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';

export default function Subscriptions() {
  const theme = useTheme();
  const router = useRouter();
  const subs = useFinancialStore((s) => s.snapshot.subscriptions);
  const currency = useFinancialStore((s) => s.snapshot.currentBalance.currency);
  const deleteSubscription = useFinancialStore((s) => s.deleteSubscription);
  const totals = subscriptionTotals(subs, currency);

  const remove = (id: string, name: string) => {
    Alert.alert('Eliminar suscripción', `¿Eliminar ${name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteSubscription(id) },
    ]);
  };

  return (
    <Screen edges={{ top: true }}>
      <Header onBack={() => router.back()} onAdd={() => router.push('/suscripciones/nueva')} />

      {subs.length === 0 ? (
        <EmptyState
          title="Sin suscripciones aún"
          body="Agrega Netflix, Spotify, gimnasio… y descubre cuánto suman al año."
          actionLabel="Agregar suscripción"
          onAction={() => router.push('/suscripciones/nueva')}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: 0, gap: theme.spacing.lg }} showsVerticalScrollIndicator={false}>
          <Card variant="highlight">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ gap: theme.spacing.xxs }}>
                <Text variant="label" color="muted">Al mes</Text>
                <Money amount={totals.monthly} size="medium" />
              </View>
              <View style={{ gap: theme.spacing.xxs, alignItems: 'flex-end' }}>
                <Text variant="label" color="muted">Al año</Text>
                <Money amount={totals.yearly} size="medium" color="brand" showDecimals={false} />
              </View>
            </View>
          </Card>

          <View style={{ gap: theme.spacing.md }}>
            {subs.map((s) => (
              <Card key={s.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                  <View style={{ width: 44, height: 44, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface.interactive, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="repeat" size={20} color="secondary" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="h3">{s.name}</Text>
                    <Text variant="caption" color="muted">Renueva el día {s.renewalDay}</Text>
                  </View>
                  <Text variant="moneySmall">{formatMoney(s.amount)}</Text>
                  <Pressable onPress={() => router.push({ pathname: '/suscripciones/nueva', params: { id: s.id } })} accessibilityRole="button" accessibilityLabel={`Editar ${s.name}`} hitSlop={8}>
                    <Icon name="pencil" size={18} color="brand" />
                  </Pressable>
                  <Pressable onPress={() => remove(s.id, s.name)} accessibilityRole="button" accessibilityLabel={`Eliminar ${s.name}`} hitSlop={8}>
                    <Icon name="trash-2" size={18} color="muted" />
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>

          <Button label="Agregar suscripción" variant="secondary" icon="plus" fullWidth onPress={() => router.push('/suscripciones/nueva')} />
        </ScrollView>
      )}
    </Screen>
  );
}

function Header({ onBack, onAdd }: { onBack: () => void; onAdd: () => void }) {
  const theme = useTheme();
  return (
    <View style={{ padding: theme.spacing.xl }}><PageHeader title="Suscripciones" subtitle="Lo que pagas cada mes y cuánto suma al año" onBack={onBack} action={<Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel="Agregar" hitSlop={8}
        style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.brand.soft, borderWidth: 1, borderColor: theme.colors.border.active }}>
        <Icon name="plus" size={22} color="brand" />
      </Pressable>} /></View>
  );
}
