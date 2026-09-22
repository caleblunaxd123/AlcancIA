import React from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { useTheme } from '@/theme';

function RecoveryScreen({ onReset }: { onReset: () => void }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background.primary,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
        gap: theme.spacing.md,
      }}
    >
      <Icon name="life-buoy" size={44} color="brand" />
      <Text variant="title" center>
        Algo se movió de lugar
      </Text>
      <Text variant="body" color="muted" center>
        Tu dinero está a salvo. Vuelve al inicio para continuar donde quedaste.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver al inicio"
        onPress={onReset}
        style={{
          marginTop: theme.spacing.md,
          minHeight: theme.minTouchTarget,
          paddingHorizontal: theme.spacing.xl,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.brand.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="bodyStrong" color="onBrand">
          Volver al inicio
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Global safety net (§71): a render crash anywhere shows a calm recovery
 * screen instead of a white screen or a raw stack trace.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <RecoveryScreen onReset={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
