import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Platform,
  useColorScheme as useSystemColorScheme,
} from 'react-native';

import { useAppStore, type ThemePreference } from '@/store/appStore';

import { motion, spring, timing, easing, STAGGER_STEP } from './motion';
import { elevation, radius, spacing, MIN_TOUCH_TARGET } from './spacing';
import { darkColors, lightColors, type ColorTokens } from './tokens';
import { fontFamily, typography } from './typography';

export type ColorScheme = 'light' | 'dark';
export type { ThemePreference };

export type Theme = {
  scheme: ColorScheme;
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  elevation: typeof elevation;
  typography: typeof typography;
  fontFamily: Record<keyof typeof fontFamily, string>;
  motion: typeof motion;
  timing: typeof timing;
  spring: typeof spring;
  easing: typeof easing;
  staggerStep: number;
  minTouchTarget: number;
  /** True when the user has requested reduced motion at the OS level (§31/§53). */
  reducedMotion: boolean;
};

type ThemeContextValue = Theme & {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function buildTheme(scheme: ColorScheme, reducedMotion: boolean, fontsReady: boolean): Theme {
  const systemFamily = Platform.OS === 'ios' ? 'System' : 'sans-serif';
  const fallbackFamilies = Object.fromEntries(Object.keys(fontFamily).map((key) => [key, systemFamily])) as Theme['fontFamily'];
  const weights: Record<string, '400' | '500' | '600' | '700' | '800'> = {
    [fontFamily.regular]: '400', [fontFamily.medium]: '500', [fontFamily.semibold]: '600',
    [fontFamily.bold]: '700', [fontFamily.extrabold]: '800',
  };
  const fallbackTypography = Object.fromEntries(Object.entries(typography).map(([key, style]) => [key, {
    ...style, fontFamily: systemFamily, fontWeight: weights[style.fontFamily ?? ''] ?? '400',
  }])) as typeof typography;
  return {
    scheme,
    colors: scheme === 'dark' ? darkColors : lightColors,
    spacing,
    radius,
    elevation,
    typography: fontsReady ? typography : fallbackTypography,
    fontFamily: fontsReady ? fontFamily : fallbackFamilies,
    motion,
    timing,
    spring,
    easing,
    staggerStep: STAGGER_STEP,
    minTouchTarget: MIN_TOUCH_TARGET,
    reducedMotion,
  };
}

export function ThemeProvider({ children, fontsReady = true }: { children: React.ReactNode; fontsReady?: boolean }) {
  const systemScheme = useSystemColorScheme();
  const preference = useAppStore((s) => s.themePreference);
  const setPreference = useAppStore((s) => s.setThemePreference);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReducedMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => setReducedMotion(enabled),
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const scheme: ColorScheme =
    preference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      ...buildTheme(scheme, reducedMotion, fontsReady),
      preference,
      setPreference,
    }),
    [scheme, reducedMotion, fontsReady, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

export function useThemePreference(): {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  scheme: ColorScheme;
} {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemePreference must be used within a ThemeProvider');
  return { preference: ctx.preference, setPreference: ctx.setPreference, scheme: ctx.scheme };
}
