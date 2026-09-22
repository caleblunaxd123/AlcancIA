import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import type { Money as MoneyValue } from '@/types/money';
import { useTheme } from '@/theme';
import { AlcanciaMascot } from './AlcanciaMascot';
import { Money } from './Money';

export function HomeCompanionCard({ totalSaved, onPress }: { totalSaved: MoneyValue; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Abrir AlcancIA, tu asistente financiero">
      <LinearGradient
        colors={[
          theme.scheme === 'dark' ? 'rgba(58,45,119,0.92)' : '#E8FFF3',
          theme.colors.surface.primary,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          minHeight: 174,
          borderRadius: theme.radius.xl,
          borderWidth: 1,
          borderColor: theme.colors.border.active,
          padding: theme.spacing.xl,
          overflow: 'hidden',
        }}
      >
        <View style={{ width: '63%', gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            <Icon name="sparkles" size={16} color="brand" />
            <Text variant="label" color="brand">Tu compañera financiera</Text>
          </View>
          <Text variant="subtitle">¡Vas construyendo algo grande!</Text>
          <Text variant="caption" color="secondary">Cada pequeño paso cuenta. Tus metas ya suman:</Text>
          <Money amount={totalSaved} size="small" color="positive" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            <Text variant="caption" color="brand">Pregúntame lo que quieras</Text>
            <Icon name="arrow-right" size={14} color="brand" />
          </View>
        </View>
        <View style={{ position: 'absolute', right: -10, bottom: -12 }}>
          <AlcanciaMascot mood="happy" size={152} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}
