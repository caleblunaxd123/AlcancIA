import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlcanciaMascot } from '@/components/financial/AlcanciaMascot';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { useLightStatusBar } from '@/hooks/useLightStatusBar';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';

const BENEFITS = [
  { icon: 'shield-check', title: 'Sabe cuánto puedes gastar hoy', body: 'Sin afectar tus pagos ni tu ahorro.' },
  { icon: 'target', title: 'Ahorra para lo que quieres', body: 'Metas con fecha y un plan realista.' },
  { icon: 'split', title: 'Divide gastos con los tuyos', body: 'Familia, pareja o roommates, cuentas claras.' },
];

/**
 * Welcome, banking layout: brand band with the wordmark and a preview of what
 * the app shows you, then a white sheet with the pitch and the two doors in.
 */
export default function Welcome() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const hasAccount = useAuthStore((state) => state.account != null);
  useLightStatusBar();
  const motion = (d: number) => (theme.reducedMotion ? undefined : FadeInDown.delay(d).duration(theme.motion.slow));

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface.primary }}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        {/* Brand band */}
        <LinearGradient
          colors={[theme.colors.hero.from, theme.colors.hero.to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + theme.spacing.xl, paddingBottom: theme.spacing.giant + theme.spacing.xxl, alignItems: 'center' }}
        >
          <Animated.View entering={motion(0)} style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text variant="display" style={{ color: theme.colors.hero.text, fontSize: 34, lineHeight: 40 }}>Alcanc</Text>
            <Text variant="display" style={{ color: theme.colors.hero.accent, fontSize: 34, lineHeight: 40 }}>IA</Text>
          </Animated.View>
          <Animated.View entering={motion(60)}>
            <Text variant="caption" style={{ color: theme.colors.hero.textMuted, letterSpacing: 0.4 }}>
              Tu dinero, en buenas manos
            </Text>
          </Animated.View>

          {/* Product preview: mascot + the two things the app tells you */}
          <View style={{ marginTop: theme.spacing.xl, width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: 210 }}>
            <View
              style={{
                width: 190,
                height: 190,
                borderRadius: 95,
                backgroundColor: 'rgba(255,255,255,0.10)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlcanciaMascot mood="happy" size={160} />
            </View>
            <PreviewChip style={{ position: 'absolute', left: theme.spacing.xl, top: theme.spacing.md }} delay={200} icon="shield-check" label="Puedes gastar" value="S/ 742" />
            <PreviewChip style={{ position: 'absolute', right: theme.spacing.xl, bottom: theme.spacing.md }} delay={320} icon="plane" label="Viaje a Cusco" value="68%" />
          </View>
        </LinearGradient>

        {/* White sheet */}
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
          <Animated.View entering={motion(120)} style={{ gap: theme.spacing.sm }}>
            <Text variant="display" accessibilityRole="header" style={{ fontSize: 28, lineHeight: 34, letterSpacing: -0.6 }}>
              Entiende tu dinero.{'\n'}Decide con tranquilidad.
            </Text>
            <Text variant="body" color="secondary">
              AlcancIA te dice cuánto puedes gastar, te ayuda a ahorrar y te muestra el impacto antes de cada compra.
            </Text>
          </Animated.View>

          <View style={{ gap: theme.spacing.lg }}>
            {BENEFITS.map((benefit, i) => (
              <Animated.View key={benefit.title} entering={motion(180 + i * 60)} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: theme.colors.brand.soft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={benefit.icon} size={20} color="brand" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{benefit.title}</Text>
                  <Text variant="caption" color="secondary">{benefit.body}</Text>
                </View>
              </Animated.View>
            ))}
          </View>

          <View style={{ flex: 1 }} />

          <View style={{ gap: theme.spacing.md }}>
            <Button
              label={hasAccount ? 'Iniciar sesión' : 'Crear mi cuenta gratis'}
              size="lg"
              fullWidth
              icon="arrow-right"
              iconPosition="right"
              onPress={() => router.push(hasAccount ? '/auth/login' : '/auth/register')}
            />
            <Button
              label={hasAccount ? '¿Olvidaste tu contraseña?' : 'Ya tengo una cuenta'}
              variant="secondary"
              size="lg"
              fullWidth
              onPress={() => router.push(hasAccount ? '/auth/forgot-password' : '/auth/login')}
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs }}>
            <Icon name="lock" size={13} color="muted" />
            <Text variant="caption" color="muted" center>
              Tus datos se guardan cifrados en tu celular. Sin anuncios.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function PreviewChip({
  icon,
  label,
  value,
  delay,
  style,
}: {
  icon: string;
  label: string;
  value: string;
  delay: number;
  style: object;
}) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={theme.reducedMotion ? undefined : FadeInUp.delay(delay).duration(theme.motion.slow)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surface.primary,
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 5,
        },
        style,
      ]}
    >
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={16} color="brand" />
      </View>
      <View>
        <Text variant="caption" color="secondary" style={{ fontSize: 11, lineHeight: 14 }}>{label}</Text>
        <Text variant="bodyStrong" style={{ fontSize: 15, lineHeight: 19 }}>{value}</Text>
      </View>
    </Animated.View>
  );
}
