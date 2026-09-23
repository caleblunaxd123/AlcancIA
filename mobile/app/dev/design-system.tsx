import { Redirect, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AlcanciaMascot, type MascotMood } from '@/components/financial/AlcanciaMascot';
import { AnimatedProgress } from '@/components/financial/AnimatedProgress';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Chip } from '@/components/common/Chip';
import { Icon } from '@/components/common/Icon';
import { Money } from '@/components/financial/Money';
import { Screen } from '@/components/common/Screen';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Text } from '@/components/common/Text';
import { fromMajor } from '@/engine/money';
import { useTheme, useThemePreference } from '@/theme';

const MOODS: MascotMood[] = ['neutral', 'happy', 'thinking', 'celebrating', 'warning', 'sleeping'];

/** Internal gallery: only reachable in development builds. */
export default function DesignSystemRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <DesignSystem />;
}

function DesignSystem() {
  const theme = useTheme();
  const router = useRouter();
  const { scheme, setPreference } = useThemePreference();

  return (
    <Screen edges={{ top: true }}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.huge, gap: theme.spacing.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="title">Design System</Text>
          <Button
            label={scheme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            variant="secondary"
            icon={scheme === 'dark' ? 'sun' : 'moon'}
            onPress={() => setPreference(scheme === 'dark' ? 'light' : 'dark')}
          />
        </View>

        <View>
          <SectionHeader title="Money" />
          <Card>
            <View style={{ gap: theme.spacing.md }}>
              <Money amount={fromMajor(742.5)} size="display" />
              <Money amount={fromMajor(20000)} size="large" color="positive" showDecimals={false} />
              <Money amount={fromMajor(300)} size="medium" color="negative" />
            </View>
          </Card>
        </View>

        <View>
          <SectionHeader title="Buttons" />
          <View style={{ gap: theme.spacing.md }}>
            <Button label="Primary" fullWidth onPress={() => {}} />
            <Button label="Positive" variant="positive" fullWidth onPress={() => {}} />
            <Button label="Secondary" variant="secondary" fullWidth onPress={() => {}} />
            <Button label="Ghost" variant="ghost" onPress={() => {}} />
          </View>
        </View>

        <View>
          <SectionHeader title="Chips" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <Chip label="Comida" icon="utensils" selected onPress={() => {}} />
            <Chip label="Transporte" icon="bus" onPress={() => {}} />
            <Chip label="Delivery" icon="bike" onPress={() => {}} />
          </View>
        </View>

        <View>
          <SectionHeader title="Progress" />
          <Card>
            <View style={{ gap: theme.spacing.lg }}>
              <AnimatedProgress progress={0.36} />
              <AnimatedProgress progress={0.72} tone="positive" />
            </View>
          </Card>
        </View>

        <View>
          <SectionHeader title="Mascota — moods" />
          <Card>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: theme.spacing.md }}>
              {MOODS.map((m) => (
                <View key={m} style={{ alignItems: 'center', width: 90 }}>
                  <AlcanciaMascot mood={m} size={80} animate={false} />
                  <Text variant="caption" color="muted">
                    {m}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        <View>
          <SectionHeader title="Card variants" />
          <View style={{ gap: theme.spacing.md }}>
            {(['default', 'highlight', 'insight', 'success'] as const).map((v) => (
              <Card key={v} variant={v}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Icon name="square" size={18} color="brand" />
                  <Text variant="bodyStrong">{v}</Text>
                </View>
              </Card>
            ))}
          </View>
        </View>

        <Button label="Volver" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}
