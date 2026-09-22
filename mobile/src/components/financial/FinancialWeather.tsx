import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BottomSheet } from '@/components/common/BottomSheet';
import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { weatherEmoji, type WeatherResult } from '@/engine/weather';
import { useTheme } from '@/theme';

export type FinancialWeatherProps = {
  weather: WeatherResult;
};

/** Compact weather pill in the Home header that opens a "¿por qué?" sheet (§4/§12). */
export function FinancialWeather({ weather }: FinancialWeatherProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Clima financiero: ${weather.state}. ${weather.headline}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surface.primary,
          borderWidth: 1,
          borderColor: theme.colors.border.subtle,
          alignSelf: 'flex-start',
        }}
      >
        <Text variant="body">{weatherEmoji(weather.state)}</Text>
        <Text variant="bodyStrong" color="secondary">
          {weather.headline}
        </Text>
        <Icon name="chevron-right" size={16} color="muted" />
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
