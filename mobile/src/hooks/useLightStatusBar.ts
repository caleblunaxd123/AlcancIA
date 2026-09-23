import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';

import { useTheme } from '@/theme';

/**
 * For screens with a dark brand band at the top (Home, Welcome): light status
 * bar icons while focused, the theme default again as soon as they blur —
 * including when another screen is pushed on top.
 */
export function useLightStatusBar(): void {
  const theme = useTheme();
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle(theme.scheme === 'dark' ? 'light' : 'dark');
    }, [theme.scheme]),
  );
}
