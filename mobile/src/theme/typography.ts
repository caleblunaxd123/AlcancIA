/**
 * Typography scale. Uses Plus Jakarta Sans (loaded at app root).
 * `money*` variants are tuned for tabular monetary display.
 */
import type { TextStyle } from 'react-native';

export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export type TypographyVariant =
  | 'displayMoney'
  | 'display'
  | 'title'
  | 'subtitle'
  | 'h3'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'label'
  | 'moneyLarge'
  | 'moneyMedium'
  | 'moneySmall';

export const typography: Record<TypographyVariant, TextStyle> = {
  displayMoney: {
    fontFamily: fontFamily.extrabold,
    fontSize: 52,
    lineHeight: 58,
    letterSpacing: -1.2,
  },
  display: {
    fontFamily: fontFamily.extrabold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 22,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyStrong: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  moneyLarge: {
    fontFamily: fontFamily.extrabold,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.8,
  },
  moneyMedium: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  moneySmall: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
};
