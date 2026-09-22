import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, View } from 'react-native';

import { AnimatedProgress } from './AnimatedProgress';
import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import type { Mission } from '@/features/challenges/missions';
import { useTheme } from '@/theme';

const challengeMascot = require('../../../assets/branding/mascot-challenge.png');
const savingMascot = require('../../../assets/branding/mascot-saving.png');

const DARK_GRADIENTS: Record<Mission['accent'], [string, string]> = {
  mint: ['rgba(25,102,91,0.72)', 'rgba(18,46,74,0.94)'],
  violet: ['rgba(86,58,135,0.72)', 'rgba(18,46,74,0.94)'],
  sky: ['rgba(44,92,133,0.72)', 'rgba(18,46,74,0.94)'],
};

const LIGHT_GRADIENTS: Record<Mission['accent'], [string, string]> = {
  mint: ['#E8FFF3', '#F8FFFB'],
  violet: ['#F1EBFF', '#FCFAFF'],
  sky: ['#EAF5FF', '#FBFDFF'],
};

export function MissionCard({ mission, completed = false, onPress, compact = false }: { mission: Mission; completed?: boolean; onPress?: () => void; compact?: boolean }) {
  const theme = useTheme();
  const progress = completed ? 1 : mission.progress / mission.target;
  const image = mission.artwork === 'focus' ? savingMascot : challengeMascot;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${mission.title}, ${completed ? 'completada' : mission.progressLabel}`}
    >
      <LinearGradient
        colors={(theme.scheme === 'light' ? LIGHT_GRADIENTS : DARK_GRADIENTS)[mission.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          minHeight: compact ? 150 : 178,
          borderRadius: theme.radius.xl,
          borderWidth: 1,
          borderColor: completed ? theme.colors.money.positive : theme.colors.border.strong,
          overflow: 'hidden',
          padding: theme.spacing.xl,
          justifyContent: 'space-between',
        }}
      >
        <View style={{ width: compact ? '68%' : '70%', gap: theme.spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            {completed ? <Icon name="circle-check" size={17} color="positive" /> : null}
            <Text variant="h3">{mission.title}</Text>
          </View>
          <Text variant="caption" color="secondary">{mission.subtitle}</Text>
        </View>

        <Image
          source={image}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          style={{
            position: 'absolute',
            width: compact ? 116 : 142,
            height: compact ? 116 : 142,
            right: -8,
            bottom: -5,
            opacity: completed ? 0.72 : 1,
          }}
        />

        <View style={{ width: '62%', gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="caption" color="secondary">{completed ? 'Completada' : mission.progressLabel}</Text>
            {!compact ? <Text variant="caption" color="positive">+{mission.reward} semillas</Text> : null}
          </View>
          <AnimatedProgress progress={progress} tone="positive" height={8} trackColor={theme.scheme === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.13)'} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}
