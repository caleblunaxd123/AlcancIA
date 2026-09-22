import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

export type ScreenProps = {
  children: ReactNode;
  /** Apply top safe-area padding. */
  edges?: { top?: boolean; bottom?: boolean };
};

/**
 * Base screen surface with a theme-aware ambient glow.
 */
export function Screen({ children, edges = { top: true, bottom: false } }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background.primary }]}>
      <LinearGradient
        colors={[
          theme.scheme === 'dark' ? 'rgba(147,112,255,0.16)' : 'rgba(59,130,246,0.10)',
          theme.scheme === 'dark' ? 'transparent' : 'rgba(34,197,94,0.04)',
          'transparent',
        ]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 0.72 }}
        style={styles.glow}
        pointerEvents="none"
      />
      <View
        style={{
          flex: 1,
          paddingTop: edges.top ? insets.top : 0,
          paddingBottom: edges.bottom ? insets.bottom : 0,
        }}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
});
