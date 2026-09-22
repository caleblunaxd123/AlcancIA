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
import Svg, { Circle, Ellipse, G, Path, Defs, RadialGradient, Stop } from 'react-native-svg';

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

/**
 * Provisional AlcancIA mascot — a modern, stylized piggy bank rendered as SVG so
 * it themes cleanly and ships with no binary asset. Designed to be swapped for
 * final 3D/Rive assets behind this same `mood` API (§6).
 */
export function AlcanciaMascot({ mood = 'neutral', size = 120, animate = true }: AlcanciaMascotProps) {
  const theme = useTheme();
  const float = useSharedValue(0);
  const breathe = useSharedValue(1);
  const active = animate && !theme.reducedMotion && mood !== 'sleeping';

  useEffect(() => {
    if (!active) {
      float.value = 0;
      breathe.value = 1;
      return;
    }
    float.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [active, float, breathe]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }, { scale: breathe.value }],
  }));

  const pink = '#FF9EC4';
  const pinkDark = '#F27FAE';
  const cheek = 'rgba(255,120,170,0.5)';
  const snout = '#FFB8D4';
  const eyeColor = theme.scheme === 'dark' ? '#1A1130' : '#3A2A55';

  // Mood-driven features.
  const eyesClosed = mood === 'sleeping';
  const eyeH = mood === 'happy' || mood === 'celebrating' ? 7 : 9;
  const mouthPath =
    mood === 'celebrating' || mood === 'happy'
      ? 'M84 128 Q100 144 116 128'
      : mood === 'warning'
        ? 'M88 134 Q100 126 112 134'
        : 'M90 130 Q100 138 110 130';

  return (
    <Animated.View style={[{ width: size, height: size }, containerStyle]} accessibilityLabel="AlcancIA">
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="45%" r="55%">
            <Stop offset="0%" stopColor={theme.colors.brand.accent} stopOpacity={0.55} />
            <Stop offset="100%" stopColor={theme.colors.brand.accent} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="body" cx="42%" cy="38%" r="70%">
            <Stop offset="0%" stopColor="#FFC0DA" />
            <Stop offset="100%" stopColor={pink} />
          </RadialGradient>
        </Defs>

        {/* Ambient AI glow */}
        <Circle cx="100" cy="95" r="92" fill="url(#glow)" />

        {/* Ears */}
        <Path d="M58 70 L48 40 L82 60 Z" fill={pinkDark} />
        <Path d="M142 70 L152 40 L118 60 Z" fill={pinkDark} />

        {/* Head/body */}
        <Ellipse cx="100" cy="105" rx="66" ry="60" fill="url(#body)" />

        {/* Cheeks */}
        <Circle cx="66" cy="118" r="12" fill={cheek} />
        <Circle cx="134" cy="118" r="12" fill={cheek} />

        {/* Eyes */}
        {eyesClosed ? (
          <>
            <Path d="M72 96 Q80 102 88 96" stroke={eyeColor} strokeWidth={4} strokeLinecap="round" fill="none" />
            <Path d="M112 96 Q120 102 128 96" stroke={eyeColor} strokeWidth={4} strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            <Ellipse cx="80" cy="98" rx="6" ry={eyeH} fill={eyeColor} />
            <Ellipse cx="120" cy="98" rx="6" ry={eyeH} fill={eyeColor} />
            <Circle cx="82" cy="95" r="2" fill="#FFFFFF" />
            <Circle cx="122" cy="95" r="2" fill="#FFFFFF" />
          </>
        )}

        {/* Snout */}
        <G>
          <Ellipse cx="100" cy="120" rx="24" ry="17" fill={snout} />
          <Ellipse cx="92" cy="120" rx="4" ry="6" fill={pinkDark} />
          <Ellipse cx="108" cy="120" rx="4" ry="6" fill={pinkDark} />
        </G>

        {/* Mouth */}
        <Path d={mouthPath} stroke={eyeColor} strokeWidth={3.5} strokeLinecap="round" fill="none" />

        {/* Coin slot on top */}
        <Path d="M84 52 L116 52" stroke={pinkDark} strokeWidth={5} strokeLinecap="round" />

        {/* IA badge */}
        <Circle cx="150" cy="150" r="19" fill={theme.colors.brand.primary} />
        <Circle cx="150" cy="150" r="19" fill="none" stroke={theme.colors.brand.secondary} strokeWidth={2} />
      </Svg>
      {/* IA label sits above SVG badge for crisp text */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: size * 0.12,
          bottom: size * 0.12,
          width: size * 0.2,
          height: size * 0.2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.Text
          style={{
            color: theme.colors.text.onBrand,
            fontFamily: theme.fontFamily.extrabold,
            fontSize: size * 0.09,
          }}
        >
          IA
        </Animated.Text>
      </View>
    </Animated.View>
  );
}
