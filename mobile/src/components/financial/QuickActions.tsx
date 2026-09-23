import * as Haptics from 'expo-haptics';
import { useRouter, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { useTheme } from '@/theme';

type Action = {
  label: string;
  icon: string;
  href: Href;
  hint: string;
  tone: 'warning' | 'positive' | 'info' | 'accent';
};

const ACTIONS: Action[] = [
  {
    label: 'Registrar gasto',
    icon: 'arrow-up-right',
    href: { pathname: '/movimiento/nuevo', params: { kind: 'expense' } },
    hint: 'Anota algo que pagaste',
    tone: 'warning',
  },
  {
    label: 'Registrar ingreso',
    icon: 'arrow-down-left',
    href: { pathname: '/movimiento/nuevo', params: { kind: 'income' } },
    hint: 'Anota dinero que recibiste',
    tone: 'positive',
  },
  {
    label: '¿Puedo comprarlo?',
    icon: 'shield-check',
    href: '/puedo-comprarlo',
    hint: 'Mira el impacto antes de gastar',
    tone: 'info',
  },
  {
    label: 'Dividir gasto',
    icon: 'split',
    href: '/(tabs)/familia',
    hint: 'Reparte un gasto con otras personas',
    tone: 'accent',
  },
];

/**
 * "Operaciones frecuentes": the four things a user comes to do, one tap away.
 * Rendered as a white sheet that overlaps the brand band, like a banking app.
 */
export function QuickActions() {
  const theme = useTheme();
  const router = useRouter();

  const toneColor = (tone: Action['tone']) =>
    tone === 'positive'
      ? theme.colors.money.positive
      : tone === 'info'
        ? theme.colors.status.info
        : tone === 'accent'
          ? theme.colors.brand.accent
          : theme.colors.status.warning;

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.lg,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.radius.xl,
        backgroundColor: theme.colors.surface.primary,
        borderWidth: 1,
        borderColor: theme.colors.border.subtle,
        shadowColor: '#0F1B2D',
        shadowOpacity: theme.scheme === 'light' ? 0.1 : 0.3,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
      }}
    >
      {ACTIONS.map((action) => {
        const color = toneColor(action.tone);
        return (
          <Pressable
            key={action.label}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              router.push(action.href);
            }}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityHint={action.hint}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              gap: theme.spacing.sm,
              paddingHorizontal: 2,
              opacity: pressed ? 0.6 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                alignItems: 'center',
                justifyContent: 'center',
                // 8-digit hex = the tone at ~12% opacity.
                backgroundColor: `${color}1F`,
              }}
            >
              <Icon name={action.icon} size={23} rawColor={color} />
            </View>
            <Text variant="caption" center numberOfLines={2} style={{ fontSize: 12, lineHeight: 15, color: theme.colors.text.primary }}>
              {action.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
