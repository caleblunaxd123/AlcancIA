import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

export type AnimatedProgressProps = {
  /** 0..1 */
  progress: number;
  height?: number;
  tone?: 'brand' | 'positive';
  trackColor?: string;
  style?: ViewStyle;
};

/** A rounded progress bar whose fill width animates on change (§35). */
export function AnimatedProgress({
  progress,
  height = 10,
  tone = 'brand',
  trackColor,
  style,
}: AnimatedProgressProps) {
  const theme = useTheme();
  const width = useSharedValue(0);
  const clamped = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    width.value = theme.reducedMotion
      ? clamped
      : withTiming(clamped, theme.timing.slow);
  }, [clamped, width, theme.reducedMotion, theme.timing.slow]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  const colors: [string, string] =
    tone === 'positive'
      ? [theme.colors.money.positive, theme.colors.brand.secondary]
      : [theme.colors.brand.primary, theme.colors.brand.secondary];

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[
        {
          height,
          borderRadius: height,
          backgroundColor: trackColor ?? theme.colors.surface.interactive,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[{ height: '100%', borderRadius: height }, fillStyle]}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, borderRadius: height }}
        />
      </Animated.View>
    </View>
  );
}
