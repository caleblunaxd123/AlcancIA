import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card } from '@/components/common/Card';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { MissionCard } from '@/components/financial/MissionCard';
import { buildMissions } from '@/features/challenges/missions';
import { useAppStore } from '@/store/appStore';
import { useFinancialStore } from '@/store/financialStore';
import { useTheme } from '@/theme';

type Tab = 'active' | 'completed';

export default function Challenges() {
  const theme = useTheme();
  const router = useRouter();
  const snapshot = useFinancialStore((state) => state.snapshot);
  const claimed = useAppStore((state) => state.claimedMissions);
  const claimMission = useAppStore((state) => state.claimMission);
  const [tab, setTab] = useState<Tab>('active');
  const missions = useMemo(() => buildMissions(snapshot), [snapshot]);
  const visible = missions.filter((mission) => tab === 'completed' ? claimed.includes(mission.id) : !claimed.includes(mission.id));
  const earnedSeeds = missions
    .filter((mission) => claimed.includes(mission.id))
    .reduce((total, mission) => total + mission.reward, 0);

  const claim = (id: string, ready: boolean) => {
    if (!ready) return;
    claimMission(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  return (
    <Screen edges={{ top: true }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.xl, gap: theme.spacing.md }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={10}>
          <Icon name="chevron-left" size={26} color="secondary" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="title">Misiones</Text>
          <Text variant="caption" color="muted">Pequeños hábitos. Progreso real.</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          <Icon name="sprout" size={18} color="positive" />
          <Text variant="bodyStrong" color="positive">{earnedSeeds}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginHorizontal: theme.spacing.xl, padding: 4, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface.primary }}>
        <TabButton label="Activas" selected={tab === 'active'} onPress={() => setTab('active')} />
        <TabButton label="Completadas" selected={tab === 'completed'} onPress={() => setTab('completed')} />
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.lg, paddingBottom: theme.spacing.huge }} showsVerticalScrollIndicator={false}>
        {visible.length ? visible.map((mission, index) => {
          const ready = mission.progress >= mission.target;
          return (
            <Animated.View key={mission.id} entering={theme.reducedMotion ? undefined : FadeInDown.delay(index * theme.staggerStep)}>
              <MissionCard mission={mission} completed={tab === 'completed'} onPress={() => claim(mission.id, ready)} />
              {tab === 'active' && ready ? (
                <Text variant="caption" color="positive" style={{ marginTop: theme.spacing.xs, marginLeft: theme.spacing.md }}>
                  Toca para completar y guardar tu logro.
                </Text>
              ) : null}
            </Animated.View>
          );
        }) : (
          <Card>
            <View style={{ alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.xl }}>
              <Icon name={tab === 'completed' ? 'sprout' : 'sparkles'} size={34} color="brand" />
              <Text variant="subtitle" center>{tab === 'completed' ? 'Tu jardín está empezando' : 'Todo al día'}</Text>
              <Text variant="body" color="muted" center>
                {tab === 'completed' ? 'Completa una misión para verla aquí.' : 'Pronto aparecerán nuevas misiones.'}
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

function TabButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      style={{ flex: 1, minHeight: 44, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? theme.colors.brand.primary : 'transparent' }}
    >
      <Text variant="bodyStrong" color={selected ? 'onBrand' : 'muted'}>{label}</Text>
    </Pressable>
  );
}
