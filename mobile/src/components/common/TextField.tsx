import { useId, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from './Text';
import { useTheme } from '@/theme';

export type TextFieldProps = TextInputProps & {
  label?: string;
  /** Prefix shown inside the field, e.g. "S/". */
  prefix?: string;
  /** Suffix shown inside the field, e.g. "%". */
  suffix?: string;
  helperText?: string;
  error?: string;
};

export function TextField({ label, prefix, suffix, helperText, error, style, onFocus, onBlur, accessibilityHint, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const generatedId = useId().replace(/:/g, '');
  const labelId = `label-${generatedId}`;
  const helpId = `help-${generatedId}`;

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {label ? (
        <Text nativeID={labelId} variant="label" color={error ? 'warning' : 'muted'}>
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
          borderColor: error ? theme.colors.status.warning : focused ? theme.colors.brand.primary : theme.colors.border.subtle,
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
          accessibilityLabel={rest.accessibilityLabel ?? label}
          accessibilityLabelledBy={label ? labelId : undefined}
          accessibilityHint={error ?? helperText ?? accessibilityHint}
          onFocus={(event) => { setFocused(true); onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
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
        {suffix ? (
          <Text variant="subtitle" color="secondary">
            {suffix}
          </Text>
        ) : null}
      </View>
      {error || helperText ? (
        <Text
          nativeID={helpId}
          variant="caption"
          color={error ? 'warning' : 'muted'}
          accessibilityLiveRegion={error ? 'polite' : 'none'}
        >
          {error ?? helperText}
        </Text>
      ) : null}
    </View>
  );
}
