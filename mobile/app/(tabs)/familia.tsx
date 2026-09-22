import { ScrollView, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { demoUser } from '@/data/demo';
import { useTheme } from '@/theme';

const MEMBERS = [
  { name: 'Caleb', role: 'Tú', income: 'S/ 3,500' },
  { name: 'Yesenia', role: 'Pareja', income: 'Privado' },
];

export default function Familia() {
  const theme = useTheme();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.huge, gap: theme.spacing.lg }} showsVerticalScrollIndicator={false}>
        <View>
          <Text variant="title">{demoUser.household}</Text>
          <Text variant="caption" color="muted">
            Dinero mío + dinero nuestro, con tu privacidad primero.
          </Text>
        </View>

        {MEMBERS.map((m) => (
          <Card key={m.name}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: theme.colors.brand.soft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="subtitle" color="brand">
                  {m.name.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="h3">{m.name}</Text>
                <Text variant="caption" color="muted">
                  {m.role}
                </Text>
              </View>
              <Text variant="bodyStrong" color="secondary">
                {m.income}
              </Text>
            </View>
          </Card>
        ))}

        <Card variant="insight">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
            <Icon name="scale" size={18} color="positive" />
            <Text variant="label" color="positive">
              Aporte sugerido
            </Text>
          </View>
          <Text variant="body">
            Según sus ingresos, un aporte proporcional al hogar sería 41% y 59%. Es solo una sugerencia: ustedes deciden.
          </Text>
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Icon name="lock" size={18} color="secondary" />
            <Text variant="body" color="secondary" style={{ flex: 1 }}>
              Cada persona decide qué comparte: todo, solo aportes del hogar, o mantener sus gastos personales privados.
            </Text>
          </View>
        </Card>

        <Text variant="caption" color="muted" center>
          Finanzas compartidas con permisos reales llegan en la Fase 6.
        </Text>
      </ScrollView>
    </Screen>
  );
}
