/**
 * Semantic color tokens — the ONLY colors components should reference.
 *
 * Each scheme (dark / light) provides the same token shape so components stay
 * scheme-agnostic. Light is the primary AlcancIA experience; dark remains a
 * deliberate alternate theme rather than an automatic inversion.
 */

import { palette } from './palette';

export type ColorTokens = {
  background: {
    /** App canvas. */
    primary: string;
    /** Slightly raised zones / grouped sections. */
    secondary: string;
    /** Elevated modal / bottom-sheet backdrop base. */
    elevated: string;
  };
  surface: {
    /** Default card. */
    primary: string;
    /** Nested card / inner block. */
    secondary: string;
    /** Interactive chip / control fill. */
    interactive: string;
  };
  brand: {
    primary: string;
    secondary: string;
    /** AI / sparkle accent. */
    accent: string;
    /** Subtle brand tint for backgrounds. */
    soft: string;
  };
  money: {
    positive: string;
    negative: string;
    neutral: string;
  };
  status: {
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    /** Text placed on top of a brand-filled surface. */
    onBrand: string;
    /** Text on money-positive fills. */
    onAccent: string;
  };
  border: {
    subtle: string;
    active: string;
    strong: string;
  };
  /** Overlay scrim for sheets / modals. */
  scrim: string;
};

export const darkColors: ColorTokens = {
  background: {
    primary: palette.navy[800],
    secondary: palette.navy[700],
    elevated: palette.navy[600],
  },
  surface: {
    primary: palette.navy[600],
    secondary: palette.navy[500],
    interactive: palette.navy[400],
  },
  brand: {
    primary: palette.violet[400],
    secondary: palette.violet[300],
    accent: palette.violet[300],
    soft: 'rgba(147, 112, 255, 0.16)',
  },
  money: {
    positive: palette.mint[400],
    negative: palette.coral[400],
    neutral: palette.slate[200],
  },
  status: {
    success: palette.mint[400],
    warning: palette.amber[400],
    danger: palette.coral[400],
    info: palette.sky[400],
  },
  text: {
    primary: palette.slate[50],
    secondary: palette.slate[200],
    muted: palette.slate[400],
    onBrand: palette.white,
    onAccent: palette.navy[900],
  },
  border: {
    subtle: 'rgba(199, 210, 226, 0.10)',
    active: 'rgba(147, 112, 255, 0.55)',
    strong: 'rgba(199, 210, 226, 0.22)',
  },
  scrim: 'rgba(5, 15, 29, 0.72)',
};

export const lightColors: ColorTokens = {
  background: {
    primary: '#F8FAFC',
    secondary: '#F2F8F5',
    elevated: '#FFFFFF',
  },
  surface: {
    primary: '#FFFFFF',
    secondary: '#F7FBF9',
    interactive: '#EEF6F2',
  },
  brand: {
    primary: '#22C55E',
    secondary: '#16B86A',
    accent: '#8B5CF6',
    soft: 'rgba(34, 197, 94, 0.10)',
  },
  money: {
    positive: '#16B86A',
    negative: '#F9737D',
    neutral: '#64748B',
  },
  status: {
    success: '#22C55E',
    warning: '#FACC15',
    danger: '#F9737D',
    info: '#3B82F6',
  },
  text: {
    primary: '#0F172A',
    secondary: '#64748B',
    muted: '#94A3B8',
    onBrand: palette.white,
    onAccent: palette.white,
  },
  border: {
    subtle: 'rgba(15, 23, 42, 0.08)',
    active: 'rgba(34, 197, 94, 0.42)',
    strong: 'rgba(15, 23, 42, 0.14)',
  },
  scrim: 'rgba(15, 23, 42, 0.36)',
};
