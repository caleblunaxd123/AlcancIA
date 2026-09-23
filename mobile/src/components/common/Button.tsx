import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Icon } from './Icon';
import { Text } from './Text';
import { useTheme } from '@/theme';

/** `danger`: outlined, for destructive actions (never the default choice). */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'positive' | 'danger';
type ButtonSize = 'md' | 'lg';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  haptic?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  haptic = true,
  fullWidth = false,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const height = size === 'lg' ? 58 : 50;
  const isDisabled = disabled || loading;

  const onPressIn = () => {
    scale.value = withSpring(0.97, theme.spring.snappy);
  };
  const onPressOut = () => {
    scale.value = withSpring(1, theme.spring.soft);
  };
  const handlePress = () => {
    if (isDisabled) return;
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.();
  };

  const textColor =
    variant === 'primary'
      ? 'onBrand'
      : variant === 'positive'
        ? 'onAccent'
        : variant === 'ghost'
          ? 'brand'
          : variant === 'danger'
            ? 'negative'
            : 'primary';

  const containerStyle: ViewStyle = {
    height,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xxl,
    opacity: isDisabled ? 0.5 : 1,
    width: fullWidth ? '100%' : undefined,
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
  };

  const solidBg =
    variant === 'secondary'
      ? theme.colors.surface.interactive
      : variant === 'ghost' || variant === 'danger'
        ? 'transparent'
        : undefined;

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={variant === 'danger' ? theme.colors.money.negative : theme.colors.text.onBrand} />
      ) : (
        <>
          {icon && iconPosition === 'left' ? (
            <Icon name={icon} size={size === 'lg' ? 20 : 18} color={textColor} />
          ) : null}
          <Text variant={size === 'lg' ? 'subtitle' : 'bodyStrong'} color={textColor}>
            {label}
          </Text>
          {icon && iconPosition === 'right' ? (
            <Icon name={icon} size={size === 'lg' ? 20 : 18} color={textColor} />
          ) : null}
        </>
      )}
    </>
  );

  const useGradient = variant === 'primary' || variant === 'positive';
  const gradientColors: [string, string] =
    variant === 'positive'
      ? [theme.colors.money.positive, theme.scheme === 'dark' ? '#2EC9A6' : '#1FB894']
      : [theme.colors.brand.primary, theme.colors.brand.secondary];

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={isDisabled}
      style={[animatedStyle, fullWidth ? { width: '100%' } : { alignSelf: 'flex-start' }, style]}
    >
      {useGradient ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={containerStyle}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={[containerStyle, { backgroundColor: solidBg }, variant === 'danger' ? { borderWidth: 1.5, borderColor: theme.colors.money.negative } : null]}>{content}</View>
      )}
    </AnimatedPressable>
  );
}
