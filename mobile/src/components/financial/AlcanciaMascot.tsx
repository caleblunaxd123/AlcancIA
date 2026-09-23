import { useEffect } from 'react';
import { Image, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

export type MascotMood =
  | 'neutral'
  | 'happy'
  | 'thinking'
  | 'celebrating'
  | 'warning'
  | 'sleeping';

export type AlcanciaMascotProps = {
  mood?: MascotMood;
  size?: number;
  /** Disable ambient motion (also auto-disabled under reduced motion). */
  animate?: boolean;
};

const heroMascot = require('../../../assets/branding/mascot-hero.webp');
const thinkingMascot = require('../../../assets/branding/mascot-thinking.webp');

/**
 * Mood-based mascot facade. Generated 3D art powers the main states while
 * motion stays lightweight, code-native, and reduced-motion aware.
 */
export function AlcanciaMascot({ mood = 'neutral', size = 120, animate = true }: AlcanciaMascotProps) {
  const theme = useTheme();
  const float = useSharedValue(0);
  const breathe = useSharedValue(1);
  const active = animate && !theme.reducedMotion && mood !== 'sleeping';
  const isThinking = mood === 'thinking' || mood === 'warning';

  useEffect(() => {
    if (!active) {
      float.value = 0;
      breathe.value = 1;
      return;
    }
    const lift = mood === 'celebrating' ? -8 : -4;
    const duration = mood === 'celebrating' ? 720 : 1800;
    float.value = withRepeat(
      withSequence(
        withTiming(lift, { duration, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.quad) }),
      ),
      mood === 'thinking' ? -1 : 3,
      false,
    );
    breathe.value = withRepeat(
      withSequence(
        withTiming(mood === 'celebrating' ? 1.045 : 1.018, { duration, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }),
      ),
      mood === 'thinking' ? -1 : 3,
      false,
    );
  }, [active, breathe, float, mood]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }, { scale: breathe.value }],
  }));

  const accessibleMood =
    mood === 'thinking' ? 'pensando' : mood === 'celebrating' ? 'celebrando' : 'tu asistente financiero';

  return (
    <Animated.View
      accessibilityRole="image"
      accessibilityLabel={`AlcancIA, ${accessibleMood}`}
      style={[{ width: size, height: size }, animatedStyle]}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: size * 0.14,
          right: size * 0.14,
          top: size * 0.18,
          bottom: size * 0.1,
          borderRadius: size,
          backgroundColor: isThinking ? 'rgba(66,224,181,0.13)' : theme.colors.brand.soft,
          shadowColor: isThinking ? theme.colors.money.positive : theme.colors.brand.primary,
          shadowOpacity: 0.42,
          shadowRadius: size * 0.16,
          elevation: 5,
        }}
      />
      <Image
        source={isThinking ? thinkingMascot : heroMascot}
        resizeMode="contain"
        style={{ width: size, height: size }}
      />
      {mood === 'sleeping' ? (
        <View style={{ position: 'absolute', right: 0, top: size * 0.12 }}>
          <Animated.Text
            style={{
              color: theme.colors.brand.secondary,
              fontFamily: theme.fontFamily.bold,
              fontSize: size * 0.16,
            }}
          >
            zZ
          </Animated.Text>
        </View>
      ) : null}
    </Animated.View>
  );
}
