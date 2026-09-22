import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from './Text';
import { useTheme } from '@/theme';

export type TextFieldProps = TextInputProps & {
  label?: string;
  /** Prefix shown inside the field, e.g. "S/". */
  prefix?: string;
};

export function TextField({ label, prefix, style, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {label ? (
        <Text variant="label" color="muted">
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: focused ? theme.colors.brand.primary : theme.colors.border.subtle,
          backgroundColor: theme.colors.surface.primary,
          paddingHorizontal: theme.spacing.lg,
          minHeight: 54,
        }}
      >
        {prefix ? (
          <Text variant="subtitle" color="secondary">
            {prefix}
          </Text>
        ) : null}
        <TextInput
          placeholderTextColor={theme.colors.text.muted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            {
              flex: 1,
              color: theme.colors.text.primary,
              fontFamily: theme.fontFamily.semibold,
              fontSize: 17,
              paddingVertical: theme.spacing.md,
            },
            style,
          ]}
          {...rest}
        />
      </View>
    </View>
  );
}
