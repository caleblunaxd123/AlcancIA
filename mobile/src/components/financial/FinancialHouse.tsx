import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/theme';
import type { WeatherState } from '@/types/domain';

export type FinancialHouseProps = {
  /** 0..1 overall health (drives window warmth + decor). */
  health: number;
  /** 0..1 savings progress (drives plant growth). */
  savingsProgress: number;
  weather: WeatherState;
  width?: number;
};

const SKY: Record<WeatherState, [string, string]> = {
  calm: ['#2A3E68', '#1A2A4A'],
  stable: ['#243759', '#152740'],
  tight: ['#2A3450', '#141E33'],
  attention: ['#2C3346', '#151B2B'],
  stormy: ['#2E3140', '#161A26'],
};

/**
 * A small, warm home scene (§13). It never looks "destroyed" when finances are
 * tight — instead it grows lighter, greener, and more decorated as things
 * improve. Encouraging, never shaming.
 */
export function FinancialHouse({ health, savingsProgress, weather, width = 320 }: FinancialHouseProps) {
  const theme = useTheme();
  const height = width * 0.62;
  const sway = useSharedValue(0);
  const windowGlow = Math.max(0.25, Math.min(1, health));
  const plantScale = 0.5 + Math.max(0, Math.min(1, savingsProgress)) * 0.6;

  useEffect(() => {
    if (theme.reducedMotion) return;
    sway.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
        withTiming(-1.5, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [sway, theme.reducedMotion]);

  const plantStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sway.value}deg` }],
  }));

  const sky = SKY[weather];
  const showStars = weather === 'calm' || weather === 'stable';

  return (
    <View style={{ width, height, borderRadius: theme.radius.xl, overflow: 'hidden' }} accessibilityLabel="Tu casa financiera">
      <Svg width={width} height={height} viewBox="0 0 320 200">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={sky[0]} />
            <Stop offset="100%" stopColor={sky[1]} />
          </LinearGradient>
          <LinearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#1D3A2E" />
            <Stop offset="100%" stopColor="#152B22" />
          </LinearGradient>
          <LinearGradient id="win" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFE3A6" stopOpacity={windowGlow} />
            <Stop offset="100%" stopColor="#F5B94F" stopOpacity={windowGlow} />
          </LinearGradient>
        </Defs>

        {/* Sky */}
        <Rect x="0" y="0" width="320" height="200" fill="url(#sky)" />

        {/* Stars / moon on good weather */}
        {showStars ? (
          <G>
            <Circle cx="250" cy="36" r="14" fill="#F5F0E0" opacity={0.9} />
            <Circle cx="244" cy="32" r="12" fill={sky[0]} />
            <Circle cx="60" cy="30" r="1.6" fill="#FFFFFF" opacity={0.9} />
            <Circle cx="95" cy="50" r="1.4" fill="#FFFFFF" opacity={0.7} />
            <Circle cx="150" cy="26" r="1.6" fill="#FFFFFF" opacity={0.8} />
            <Circle cx="200" cy="60" r="1.2" fill="#FFFFFF" opacity={0.6} />
          </G>
        ) : (
          <G opacity={0.5}>
            <Path d="M40 46 q14 -10 28 0 q14 -8 26 2 q6 8 -4 12 l-52 0 q-8 -6 2 -14 Z" fill="#3A4258" />
            <Path d="M210 40 q12 -8 24 0 q12 -6 22 2 q6 7 -4 11 l-46 0 q-6 -6 4 -13 Z" fill="#343B50" />
          </G>
        )}

        {/* Ground */}
        <Rect x="0" y="150" width="320" height="50" fill="url(#ground)" />

        {/* House body */}
        <G>
          <Rect x="104" y="96" width="112" height="66" rx="6" fill={theme.colors.surface.secondary} />
          {/* Roof */}
          <Path d="M96 100 L160 58 L224 100 Z" fill={theme.colors.brand.primary} />
          {/* Door */}
          <Rect x="150" y="122" width="24" height="40" rx="5" fill={theme.colors.brand.secondary} />
          <Circle cx="169" cy="142" r="2" fill={theme.colors.text.onBrand} />
          {/* Windows */}
          <Rect x="116" y="112" width="24" height="24" rx="4" fill="url(#win)" />
          <Rect x="186" y="112" width="24" height="24" rx="4" fill="url(#win)" />
        </G>

        {/* Chimney smoke when healthy */}
        {health > 0.5 ? (
          <G opacity={0.5}>
            <Circle cx="200" cy="70" r="4" fill="#FFFFFF" />
            <Circle cx="205" cy="60" r="5" fill="#FFFFFF" />
            <Circle cx="212" cy="52" r="6" fill="#FFFFFF" />
          </G>
        ) : null}
      </Svg>

      {/* Growing savings plant (animated sway) */}
      <Animated.View
        style={[
          { position: 'absolute', left: width * 0.2, bottom: height * 0.18 },
          plantStyle,
          { transform: [{ scale: plantScale }] },
        ]}
      >
        <Svg width={46} height={70} viewBox="0 0 46 70">
          <Path d="M23 70 L23 34" stroke="#2E8B5B" strokeWidth={4} strokeLinecap="round" />
          <Path d="M23 44 q-16 -6 -18 -22 q16 2 18 18 Z" fill="#42E0B5" />
          <Path d="M23 38 q16 -8 20 -24 q-18 0 -20 20 Z" fill="#2EC9A6" />
          <Circle cx="23" cy="20" r="7" fill="#6BEAC8" />
        </Svg>
      </Animated.View>
    </View>
  );
}
