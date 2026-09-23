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
  /**
   * Bank-style brand band used at the top of Home and the Welcome screen:
   * deep blue flowing into emerald, always with white text on top.
   */
  hero: {
    from: string;
    to: string;
    text: string;
    textMuted: string;
    /** Translucent fill for chips / pills placed on the band. */
    chip: string;
    /** Bright highlight on the band (e.g. the "IA" in the wordmark). */
    accent: string;
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
  // One identity in both schemes: emerald brand, violet only as the AI accent.
  brand: {
    primary: '#34D399',
    secondary: '#10B981',
    accent: palette.violet[300],
    soft: 'rgba(52, 211, 153, 0.14)',
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
    // Bright emerald needs dark text to stay readable (AA).
    onBrand: '#052E1C',
    onAccent: palette.navy[900],
  },
  border: {
    subtle: 'rgba(199, 210, 226, 0.10)',
    active: 'rgba(52, 211, 153, 0.50)',
    strong: 'rgba(199, 210, 226, 0.22)',
  },
  hero: {
    from: '#0B2A45',
    to: '#0B5A43',
    text: palette.white,
    textMuted: 'rgba(255, 255, 255, 0.74)',
    chip: 'rgba(255, 255, 255, 0.12)',
    accent: '#6EE7B7',
  },
  scrim: 'rgba(5, 15, 29, 0.72)',
};

/**
 * Light is the hero experience. Every text/brand pair here meets WCAG AA on
 * white (the previous #22C55E brand was ~2.3:1 — unreadable on buttons/links).
 */
export const lightColors: ColorTokens = {
  background: {
    primary: '#F4F6F9',
    secondary: '#EEF2F6',
    elevated: '#FFFFFF',
  },
  surface: {
    primary: '#FFFFFF',
    secondary: '#F6F8FA',
    interactive: '#EDF3F0',
  },
  brand: {
    primary: '#0B8043', // 5.0:1 with white
    secondary: '#0E9448',
    accent: '#7C5CE0',
    soft: 'rgba(11, 128, 67, 0.09)',
  },
  money: {
    positive: '#0B8043',
    negative: '#C2413B',
    neutral: '#5B6B80',
  },
  status: {
    success: '#0B8043',
    warning: '#B45309',
    danger: '#C2413B',
    info: '#1D5FD1',
  },
  text: {
    primary: '#0F1B2D',
    secondary: '#475569',
    muted: '#64748B',
    onBrand: palette.white,
    onAccent: palette.white,
  },
  border: {
    subtle: 'rgba(15, 27, 45, 0.08)',
    active: 'rgba(11, 128, 67, 0.35)',
    strong: 'rgba(15, 27, 45, 0.16)',
  },
  hero: {
    from: '#0A3157',
    to: '#0B7A45',
    text: palette.white,
    textMuted: 'rgba(255, 255, 255, 0.78)',
    chip: 'rgba(255, 255, 255, 0.15)',
    accent: '#6EE7B7',
  },
  scrim: 'rgba(15, 27, 45, 0.40)',
};
