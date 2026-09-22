import { Pressable, View, type ViewStyle } from 'react-native';

import { Icon } from './Icon';
import { Text } from './Text';
import { useTheme } from '@/theme';

export type ChipProps = {
  label: string;
  icon?: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

export function Chip({ label, icon, selected = false, onPress, style }: ChipProps) {
  const theme = useTheme();

  const container: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: selected ? theme.colors.brand.primary : theme.colors.border.subtle,
    backgroundColor: selected ? theme.colors.brand.soft : theme.colors.surface.interactive,
    minHeight: 40,
  };

  const body = (
    <View style={[container, style]}>
      {icon ? <Icon name={icon} size={16} color={selected ? 'brand' : 'secondary'} /> : null}
      <Text variant="bodyStrong" color={selected ? 'brand' : 'secondary'}>
        {label}
      </Text>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
    >
      {body}
    </Pressable>
  );
}
