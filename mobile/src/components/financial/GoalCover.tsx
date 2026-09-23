import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { ImageBackground, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';
import type { GoalKind } from '@/types/domain';

const DARK_COVERS: Record<GoalKind, number> = {
  home: require('../../../assets/branding/goal-home-cover.webp'),
  travel: require('../../../assets/branding/goal-travel-cover.webp'),
  car: require('../../../assets/branding/goal-car-cover.webp'),
  education: require('../../../assets/branding/goal-education-cover.webp'),
  emergency: require('../../../assets/branding/goal-emergency-cover.webp'),
  wedding: require('../../../assets/branding/goal-wedding-cover.webp'),
  tech: require('../../../assets/branding/goal-tech-cover.webp'),
  pet: require('../../../assets/branding/goal-pet-cover.webp'),
  custom: require('../../../assets/branding/goal-custom-cover.webp'),
};

const LIGHT_COVERS: Record<GoalKind, number> = {
  home: require('../../../assets/branding/goal-home-cover-light.webp'),
  travel: require('../../../assets/branding/goal-travel-cover-light.webp'),
  car: require('../../../assets/branding/goal-car-cover-light.webp'),
  education: require('../../../assets/branding/goal-education-cover-light.webp'),
  emergency: require('../../../assets/branding/goal-emergency-cover-light.webp'),
  wedding: require('../../../assets/branding/goal-wedding-cover-light.webp'),
  tech: require('../../../assets/branding/goal-tech-cover-light.webp'),
  pet: require('../../../assets/branding/goal-pet-cover-light.webp'),
  custom: require('../../../assets/branding/goal-custom-cover-light.webp'),
};

const LABELS: Record<GoalKind, string> = {
  home: 'una casa, llaves y monedas de ahorro',
  travel: 'una maleta, avión y fondo de viaje',
  car: 'un auto eléctrico y ahorro para comprarlo',
  education: 'libros, tecnología y ahorro para estudiar',
  emergency: 'un fondo de emergencia protegido',
  wedding: 'anillos y ahorro para una celebración',
  tech: 'tecnología y monedas de ahorro',
  pet: 'mascotas y un fondo para su cuidado',
  custom: 'un objetivo personal y ahorro para cumplirlo',
};

/**
 * Animated art layer shared by every goal kind. Motion is intentionally slow
 * and subtle: a tiny cinematic drift plus a progress-linked glow.
 */
export function GoalCover({ kind, height = 128, progress = 0 }: { kind: GoalKind; height?: number; progress?: number }) {
  const theme = useTheme();
  const source = theme.scheme === 'light' ? LIGHT_COVERS[kind] : DARK_COVERS[kind];
  const drift = useSharedValue(0);
  const reveal = useSharedValue(theme.reducedMotion ? 1 : 0.97);
  const normalizedProgress = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    if (theme.reducedMotion) {
      drift.value = 0;
      reveal.value = 1;
      return;
    }
    reveal.value = withTiming(1, { duration: theme.motion.slow, easing: theme.easing.decelerate });
    drift.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 4200, easing: Easing.inOut(Easing.quad) }),
        withTiming(-5, { duration: 4200, easing: Easing.inOut(Easing.quad) }),
      ),
      2,
      true,
    );
  }, [drift, reveal, theme.easing.decelerate, theme.motion.slow, theme.reducedMotion]);

  const artStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drift.value }, { scale: reveal.value * 1.035 }],
  }));

  return (
    <View
      style={{ height, overflow: 'hidden' }}
      accessibilityRole="image"
      accessibilityLabel={`Ilustración de ${LABELS[kind]}`}
    >
      <Animated.View style={[{ position: 'absolute', top: -4, right: -8, bottom: -4, left: -8 }, artStyle]}>
        <ImageBackground source={source} resizeMode="cover" style={{ flex: 1 }} />
      </Animated.View>
      <LinearGradient
        colors={theme.scheme === 'light' ? ['transparent', 'rgba(255,255,255,0.34)'] : ['transparent', 'rgba(5,15,29,0.9)']}
        locations={[0.4, 1]}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          height: 3,
          width: `${Math.max(4, normalizedProgress * 100)}%`,
          backgroundColor: theme.colors.brand.secondary,
          shadowColor: theme.colors.brand.secondary,
          shadowOpacity: 0.8,
          shadowRadius: 10,
        }}
      />
    </View>
  );
}
