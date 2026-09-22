import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Dimensions, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlcanciaMascot, type MascotMood } from '@/components/financial/AlcanciaMascot';
import { FinancialHouse } from '@/components/financial/FinancialHouse';
import { Button } from '@/components/common/Button';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/theme';

const { width } = Dimensions.get('window');

type Slide = {
  mood: MascotMood;
  kind: 'mascot' | 'house';
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  { mood: 'happy', kind: 'mascot', title: 'Tu dinero puede sentirse más simple', body: 'AlcancIA convierte tus números en decisiones claras, sin fórmulas ni vergüenza.' },
  { mood: 'neutral', kind: 'house', title: 'Entiende cómo funciona tu hogar', body: 'Tu Casa Financiera muestra a dónde va tu dinero y cómo crece cada semana.' },
  { mood: 'thinking', kind: 'mascot', title: 'Prueba decisiones antes de gastar', body: '¿Puedo comprarlo? te muestra el impacto real antes de decidir. Tú siempre eliges.' },
  { mood: 'celebrating', kind: 'mascot', title: 'Convierte tus planes en caminos', body: 'Tus metas se vuelven visibles y avanzan contigo, paso a paso.' },
  { mood: 'happy', kind: 'mascot', title: 'AlcancIA entiende tu contexto', body: 'Una IA cercana que analiza, sugiere y te motiva — con tus datos, con tu ritmo.' },
];

export default function Onboarding() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const complete = useAppStore((s) => s.completeOnboarding);
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const next = () => {
    if (isLast) {
      complete();
      router.replace('/(tabs)');
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
  };

  const skip = () => {
    complete();
    router.replace('/(tabs)');
  };

  return (
    <Screen edges={{ top: true, bottom: true }}>
      <View style={{ flex: 1 }}>
        <View style={{ alignItems: 'flex-end', paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.sm }}>
          <Button label="Saltar" variant="ghost" onPress={skip} haptic={false} />
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
        >
          {SLIDES.map((slide, i) => (
            <View key={i} style={{ width, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.xxl }}>
              <Animated.View entering={FadeIn.duration(theme.motion.slow)} style={{ marginBottom: theme.spacing.giant }}>
                {slide.kind === 'mascot' ? (
                  <AlcanciaMascot mood={slide.mood} size={190} />
                ) : (
                  <FinancialHouse health={0.7} savingsProgress={0.5} weather="stable" width={width - 80} />
                )}
              </Animated.View>
              <Animated.View entering={FadeInUp.delay(120).duration(theme.motion.slow)}>
                <Text variant="title" center style={{ marginBottom: theme.spacing.md }}>
                  {slide.title}
                </Text>
                <Text variant="body" color="secondary" center>
                  {slide.body}
                </Text>
              </Animated.View>
            </View>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: theme.spacing.xxl, paddingBottom: insets.bottom + theme.spacing.lg, gap: theme.spacing.xl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.sm }}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === index ? 22 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === index ? theme.colors.brand.primary : theme.colors.border.strong,
                }}
              />
            ))}
          </View>
          <Button label={isLast ? 'Crear mi AlcancIA' : 'Continuar'} size="lg" fullWidth onPress={next} icon={isLast ? 'sparkles' : undefined} />
        </View>
      </View>
    </Screen>
  );
}
