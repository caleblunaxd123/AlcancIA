import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlcanciaMascot } from '@/components/financial/AlcanciaMascot';
import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { useLightStatusBar } from '@/hooks/useLightStatusBar';
import { useTheme } from '@/theme';

/**
 * Shared frame for login / register / password recovery — same language as
 * Welcome: brand band with the wordmark and mascot, then a white sheet that
 * holds the form. `compact` shrinks the band so long forms fit on small phones.
 */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  compact?: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useLightStatusBar();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface.primary }}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView bounces={false} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={[theme.colors.hero.from, theme.colors.hero.to]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingTop: insets.top + theme.spacing.md,
              paddingHorizontal: theme.spacing.xl,
              paddingBottom: theme.spacing.xxl + theme.spacing.xl,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
              {router.canGoBack() ? (
                <Pressable
                  onPress={() => router.back()}
                  accessibilityRole="button"
                  accessibilityLabel="Volver"
                  hitSlop={8}
                  style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.hero.chip, opacity: pressed ? 0.7 : 1 })}
                >
                  <Icon name="arrow-left" size={20} rawColor={theme.colors.hero.text} />
                </Pressable>
              ) : (
                <View style={{ width: 44 }} />
              )}
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }} accessibilityLabel="AlcancIA">
                <Text variant="title" style={{ color: theme.colors.hero.text, fontSize: 20, lineHeight: 26 }}>Alcanc</Text>
                <Text variant="title" style={{ color: theme.colors.hero.accent, fontSize: 20, lineHeight: 26 }}>IA</Text>
              </View>
              <View style={{ width: 44 }} />
            </View>

            <View style={{ alignItems: 'center', marginTop: compact ? theme.spacing.sm : theme.spacing.lg, gap: theme.spacing.xs }}>
              <View style={{ width: compact ? 96 : 124, height: compact ? 96 : 124, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' }}>
                <AlcanciaMascot mood="happy" size={compact ? 80 : 104} />
              </View>
              <Text variant="caption" style={{ color: theme.colors.hero.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                {eyebrow}
              </Text>
            </View>
          </LinearGradient>

          <View
            style={{
              flex: 1,
              marginTop: -theme.spacing.xxl,
              borderTopLeftRadius: theme.radius.xxl,
              borderTopRightRadius: theme.radius.xxl,
              backgroundColor: theme.colors.surface.primary,
              paddingHorizontal: theme.spacing.xxl,
              paddingTop: theme.spacing.xxl,
              paddingBottom: insets.bottom + theme.spacing.xl,
              gap: theme.spacing.xl,
            }}
          >
            <Animated.View entering={theme.reducedMotion ? undefined : FadeInDown.duration(theme.motion.slow)} style={{ gap: theme.spacing.xs }}>
              <Text variant="display" accessibilityRole="header" style={{ fontSize: 28, lineHeight: 34, letterSpacing: -0.6 }}>
                {title}
              </Text>
              <Text variant="body" color="secondary">{subtitle}</Text>
            </Animated.View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
