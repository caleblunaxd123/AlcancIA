/**
 * Centralized motion tokens (§37/§83). Every component reads durations and
 * springs from here — no ad-hoc timings scattered across the codebase.
 */
import type { WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';
import { Easing } from 'react-native-reanimated';

/** Microinteraction durations, in ms. */
export const motion = {
  fast: 140,
  normal: 220,
  slow: 360,
  celebration: 620,
} as const;

export const easing = {
  standard: Easing.bezier(0.22, 1, 0.36, 1),
  decelerate: Easing.out(Easing.cubic),
  accelerate: Easing.in(Easing.cubic),
} as const;

export const timing: Record<'fast' | 'normal' | 'slow', WithTimingConfig> = {
  fast: { duration: motion.fast, easing: easing.standard },
  normal: { duration: motion.normal, easing: easing.standard },
  slow: { duration: motion.slow, easing: easing.standard },
};

export const spring: Record<'soft' | 'snappy' | 'celebration', WithSpringConfig> = {
  soft: { damping: 18, stiffness: 160, mass: 0.9 },
  snappy: { damping: 20, stiffness: 320, mass: 0.7 },
  celebration: { damping: 12, stiffness: 180, mass: 1 },
};

/** Stagger step for list/card entrances, in ms. */
export const STAGGER_STEP = 60;
