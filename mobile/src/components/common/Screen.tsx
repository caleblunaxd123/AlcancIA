import type { ReactNode } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

export type ScreenProps = {
  children: ReactNode;
  /** Apply top safe-area padding. Screens with a full-bleed header pass `top: false`. */
  edges?: { top?: boolean; bottom?: boolean };
  keyboardAware?: boolean;
};

/**
 * Base screen surface: a flat, calm canvas (banking style). Color and depth
 * come from the content — header band, cards — not from the background.
 */
export function Screen({ children, edges = { top: true, bottom: false }, keyboardAware = false }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background.primary,
        paddingTop: edges.top ? insets.top : 0,
        paddingBottom: edges.bottom ? insets.bottom : 0,
      }}
    >
      {keyboardAware ? <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>{children}</KeyboardAvoidingView> : children}
    </View>
  );
}
