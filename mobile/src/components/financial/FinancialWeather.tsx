import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BottomSheet } from '@/components/common/BottomSheet';
import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { weatherEmoji, type WeatherResult } from '@/engine/weather';
import { useTheme } from '@/theme';

export type FinancialWeatherProps = {
  weather: WeatherResult;
  /** `hero` renders a translucent pill for the brand header band. */
  tone?: 'surface' | 'hero';
};

/** Compact weather pill that opens a "¿por qué?" sheet (§4/§12). */
export function FinancialWeather({ weather, tone = 'surface' }: FinancialWeatherProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const onHero = tone === 'hero';

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${weather.headline} Toca para ver por qué.`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          minHeight: 36,
          paddingVertical: theme.spacing.xs,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.pill,
          backgroundColor: onHero ? theme.colors.hero.chip : theme.colors.surface.primary,
          borderWidth: onHero ? 0 : 1,
          borderColor: theme.colors.border.subtle,
          alignSelf: 'flex-start',
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <Text variant="body">{weatherEmoji(weather.state)}</Text>
        <Text
          variant="bodyStrong"
          color="secondary"
          style={onHero ? { color: theme.colors.hero.text, fontSize: 14 } : undefined}
        >
          {weather.headline}
        </Text>
        <Icon name="chevron-right" size={16} color="muted" rawColor={onHero ? theme.colors.hero.textMuted : undefined} />
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={`${weatherEmoji(weather.state)}  Tu clima financiero`}>
        <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
          {weather.headline}
        </Text>
        <Text variant="label" color="muted">
          ¿Por qué?
        </Text>
        <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
          {weather.reasons.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Icon
                name={r.tone === 'positive' ? 'check' : 'alert-circle'}
                size={18}
                color={r.tone === 'positive' ? 'positive' : 'warning'}
              />
              <Text variant="body" color="secondary" style={{ flex: 1 }}>
                {r.text}
              </Text>
            </View>
          ))}
        </View>
      </BottomSheet>
    </>
  );
}
