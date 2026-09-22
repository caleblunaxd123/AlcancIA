/**
 * Raw color scales for AlcancIA.
 *
 * These are the primitive values only. Components must NEVER import from here
 * directly — they consume the semantic tokens exposed by `useTheme()`, which
 * map these primitives to meaning (background, surface, text, ...) per color
 * scheme. This keeps dark/light theming and future rebrands to a single file.
 *
 * Direction: deep "money night" navy + intelligent violet + growth mint.
 */

export const palette = {
  // Deep navy — the "money night" canvas from the design references.
  navy: {
    900: '#050F1D',
    800: '#071526',
    700: '#091B30',
    600: '#0B2037',
    500: '#0F2A46',
    400: '#153352',
    300: '#1D4066',
  },

  // Violet / lila — AlcancIA intelligence + the AI accent.
  violet: {
    600: '#6D4DF2',
    500: '#8B6BFF',
    400: '#9370FF',
    300: '#B296FF',
    200: '#CBB8FF',
  },

  // Mint / turquoise — positive money, growth, "you're on track".
  mint: {
    600: '#1FB894',
    500: '#2EC9A6',
    400: '#42E0B5',
    300: '#6BEAC8',
    200: '#A6F2DD',
  },

  // Coral — used sparingly for genuinely critical states. Never alarmist.
  coral: {
    500: '#F2685C',
    400: '#FF7E72',
    300: '#FF9A90',
  },

  // Amber — soft "pay attention" warmth.
  amber: {
    500: '#E8A93C',
    400: '#F5BB55',
    300: '#FBD08A',
  },

  // Soft gold accent for celebrations / premium touches.
  gold: {
    400: '#F5C77E',
    300: '#FADCA6',
  },

  // Sky — cool secondary accent.
  sky: {
    400: '#4FA9F5',
    300: '#7CC1FF',
  },

  // Pink — the AlcancIA mascot family.
  pink: {
    400: '#FF9EC4',
    300: '#FFB8D4',
  },

  // Neutral cool grays used for text on dark surfaces.
  slate: {
    50: '#F5F7FB',
    100: '#E6ECF5',
    200: '#C7D2E2',
    300: '#9FB0C6',
    400: '#7285A0',
    500: '#4E6079',
    600: '#33435C',
  },

  // Warm neutrals for light mode surfaces.
  warm: {
    50: '#FFFFFF',
    100: '#F7F8FC',
    200: '#EEF1F8',
    300: '#E2E7F1',
  },

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;
