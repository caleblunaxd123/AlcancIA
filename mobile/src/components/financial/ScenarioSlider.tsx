import { useState } from 'react';
import { View, type AccessibilityActionEvent, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { Text } from '@/components/common/Text';
import { useTheme } from '@/theme';

export type ScenarioSliderProps = {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  label?: string;
  formatValue?: (v: number) => string;
};

/**
 * Continuous, gesture-driven slider (§8/§18). Emits changes live while dragging
 * so scenarios recompute in real time — no "calculate" button.
 */
export function ScenarioSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  label,
  formatValue,
}: ScenarioSliderProps) {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const THUMB = 28;

  const clampToStep = (v: number) => {
    const stepped = Math.round(v / step) * step;
    return Math.max(min, Math.min(max, stepped));
  };

  const ratio = max > min ? (value - min) / (max - min) : 0;
  const usable = Math.max(0, trackWidth - THUMB);
  const startX = useSharedValue(0);

  const emit = (px: number) => {
    if (usable <= 0) return;
    const r = Math.max(0, Math.min(1, px / usable));
    onChange(clampToStep(min + r * (max - min)));
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = ratio * usable;
    })
    .onUpdate((e) => {
      const next = startX.value + e.translationX;
      runOnJS(emit)(next);
    });

  const tap = Gesture.Tap().onEnd((e) => {
    runOnJS(emit)(e.x - THUMB / 2);
  });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: ratio * usable }],
  }));

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const delta = event.nativeEvent.actionName === 'increment' ? step : -step;
    onChange(clampToStep(value + delta));
  };

  return (
    <View>
      {label ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
          <Text variant="label" color="muted">
            {label}
          </Text>
          <Text variant="bodyStrong" color="brand">
            {formatValue ? formatValue(value) : `${value}`}
          </Text>
        </View>
      ) : null}
      <GestureDetector gesture={Gesture.Simultaneous(pan, tap)}>
        <View
          onLayout={onLayout}
          style={{ height: 44, justifyContent: 'center' }}
          accessibilityRole="adjustable"
          accessibilityLabel={label ?? 'Selector de valor'}
          accessibilityValue={{ min, max, now: value }}
          accessibilityActions={[{ name: 'increment', label: 'Aumentar' }, { name: 'decrement', label: 'Disminuir' }]}
          onAccessibilityAction={onAccessibilityAction}
        >
          <View
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: theme.colors.surface.interactive,
            }}
          >
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${ratio * 100}%`,
                borderRadius: 4,
                backgroundColor: theme.colors.brand.primary,
              }}
            />
          </View>
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: THUMB,
                height: THUMB,
                borderRadius: THUMB / 2,
                backgroundColor: theme.colors.brand.primary,
                borderWidth: 3,
                borderColor: theme.colors.background.elevated,
              },
              theme.elevation.sm,
              thumbStyle,
            ]}
          />
        </View>
      </GestureDetector>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.xs }}>
        <Text variant="caption" color="muted">
          {formatValue ? formatValue(min) : min}
        </Text>
        <Text variant="caption" color="muted">
          {formatValue ? formatValue(max) : max}
        </Text>
      </View>
    </View>
  );
}
