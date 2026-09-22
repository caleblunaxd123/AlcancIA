import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { useTheme } from '@/theme';

const ICONS: Record<string, string> = {
  index: 'house',
  movimientos: 'arrow-left-right',
  ia: 'sparkles',
  metas: 'target',
  familia: 'users',
};

const LABELS: Record<string, string> = {
  index: 'Inicio',
  movimientos: 'Movimientos',
  ia: 'AlcancIA',
  metas: 'Metas',
  familia: 'Familia',
};

/**
 * Structural subset of the bottom-tab bar props we consume. Kept local so we
 * don't depend on expo-router's bundled react-navigation internals.
 */
type TabRoute = { key: string; name: string };
export type TabBarProps = {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

export function TabBar({ state, navigation }: TabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background.secondary,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border.subtle,
        paddingBottom: insets.bottom || theme.spacing.sm,
        paddingTop: theme.spacing.sm,
        paddingHorizontal: theme.spacing.sm,
      }}
    >
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        const isCenter = route.name === 'ia';

        const onPress = () => {
          Haptics.selectionAsync().catch(() => {});
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        if (isCenter) {
          return <CenterButton key={route.key} focused={focused} onPress={onPress} />;
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={LABELS[route.name]}
            style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: theme.spacing.xs, minHeight: 44, justifyContent: 'center' }}
          >
            <Icon name={ICONS[route.name] ?? 'circle'} size={22} color={focused ? 'brand' : 'muted'} />
            <Text variant="caption" color={focused ? 'brand' : 'muted'} style={{ fontSize: 11 }}>
              {LABELS[route.name]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CenterButton({ focused, onPress }: { focused: boolean; onPress: () => void }) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Animated.View style={animated}>
        <Pressable
          onPress={onPress}
          onPressIn={() => (scale.value = withSpring(0.92, theme.spring.snappy))}
          onPressOut={() => (scale.value = withSpring(1, theme.spring.soft))}
          accessibilityRole="button"
          accessibilityLabel="AlcancIA — asistente"
          accessibilityState={{ selected: focused }}
          style={{ marginTop: -22 }}
        >
          <LinearGradient
            colors={[theme.colors.brand.primary, theme.colors.brand.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              {
                width: 58,
                height: 58,
                borderRadius: 29,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 4,
                borderColor: theme.colors.background.secondary,
              },
              theme.elevation.md,
            ]}
          >
            <Icon name="sparkles" size={26} color="onBrand" />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}
