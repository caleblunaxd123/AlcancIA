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

import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { useTheme } from '@/theme';
import type { WeatherState } from '@/types/domain';

const financialHouseDark = require('../../../assets/branding/financial-house.png');
const financialHouseLight = require('../../../assets/branding/financial-house-light.png');

export type FinancialHouseProps = {
  /** 0..1 overall health. */
  health: number;
  /** 0..1 savings progress. */
  savingsProgress: number;
  weather: WeatherState;
  width?: number;
};

const STATUS: Record<WeatherState, { label: string; icon: string }> = {
  calm: { label: 'Próspero', icon: 'sparkles' },
  stable: { label: 'Estable', icon: 'sun' },
  tight: { label: 'Ajustado', icon: 'cloud-sun' },
  attention: { label: 'Atención', icon: 'cloud' },
  stormy: { label: 'Protegiendo', icon: 'cloud-rain' },
};

/**
 * Living financial-home diorama. The scene is art, while status, growth and
 * accessibility remain driven by the real financial engine.
 */
export function FinancialHouse({ health, savingsProgress, weather, width = 320 }: FinancialHouseProps) {
  const theme = useTheme();
  const pulse = useSharedValue(1);
  const normalizedHealth = Math.max(0, Math.min(1, health));
  const normalizedSavings = Math.max(0, Math.min(1, savingsProgress));
  const height = width * 0.64;
  const status = STATUS[weather];
  const isLight = theme.scheme === 'light';
  const primaryOverlayText = isLight ? theme.colors.text.primary : '#FFFFFF';
  const secondaryOverlayText = isLight ? theme.colors.text.secondary : 'rgba(255,255,255,0.72)';

  useEffect(() => {
    if (theme.reducedMotion) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [pulse, theme.reducedMotion]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <ImageBackground
      source={isLight ? financialHouseLight : financialHouseDark}
      resizeMode="cover"
      accessibilityRole="image"
      accessibilityLabel={`Tu casa financiera está ${status.label.toLowerCase()}; ahorro al ${Math.round(normalizedSavings * 100)} por ciento`}
      style={{ width, height, borderRadius: theme.radius.xl, overflow: 'hidden' }}
      imageStyle={{ borderRadius: theme.radius.xl }}
    >
      <LinearGradient
        colors={isLight ? ['rgba(255,255,255,0.82)', 'transparent', 'rgba(255,255,255,0.90)'] : ['rgba(5,15,29,0.82)', 'transparent', 'rgba(5,15,29,0.78)']}
        locations={[0, 0.52, 1]}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />

      <View style={{ flex: 1, padding: theme.spacing.lg, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text variant="label" style={{ color: primaryOverlayText }}>Tu hogar</Text>
            <Text variant="caption" style={{ color: secondaryOverlayText }}>
              Todo sigue en equilibrio
            </Text>
          </View>
          <Animated.View
            style={[
              {
                minHeight: 36,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.radius.pill,
                backgroundColor: isLight ? 'rgba(255,255,255,0.88)' : 'rgba(5,15,29,0.62)',
                borderWidth: 1,
                borderColor: isLight ? theme.colors.border.subtle : 'rgba(255,255,255,0.18)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.xs,
              },
              pulseStyle,
            ]}
          >
            <Icon name={status.icon} size={15} rawColor={theme.colors.money.positive} />
            <Text variant="caption" style={{ color: primaryOverlayText }}>{status.label}</Text>
          </Animated.View>
        </View>

        <View
          style={{
            alignSelf: 'stretch',
            padding: theme.spacing.md,
            borderRadius: theme.radius.lg,
            backgroundColor: isLight ? 'rgba(255,255,255,0.90)' : 'rgba(5,15,29,0.68)',
            borderWidth: 1,
            borderColor: isLight ? theme.colors.border.subtle : 'rgba(255,255,255,0.14)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
            <Text variant="caption" style={{ color: secondaryOverlayText }}>Crecimiento de tu hogar</Text>
            <Text variant="bodyStrong" style={{ color: primaryOverlayText }}>{Math.round(normalizedHealth * 100)}%</Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.16)', overflow: 'hidden' }}>
            <View
              style={{
                height: '100%',
                width: `${Math.max(6, normalizedSavings * 100)}%`,
                borderRadius: 3,
                backgroundColor: theme.colors.money.positive,
              }}
            />
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}
