import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';
import { useTheme } from '@/theme';

export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View
          entering={FadeIn.duration(theme.motion.normal)}
          exiting={FadeOut.duration(theme.motion.fast)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.scrim }}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Cerrar" accessibilityRole="button" />
        </Animated.View>

        <Animated.View
          entering={theme.reducedMotion ? undefined : SlideInDown.springify().damping(20).stiffness(220)}
          exiting={theme.reducedMotion ? undefined : SlideOutDown.duration(theme.motion.normal)}
          style={{
            backgroundColor: theme.colors.background.elevated,
            borderTopLeftRadius: theme.radius.xxl,
            borderTopRightRadius: theme.radius.xxl,
            borderWidth: 1,
            borderColor: theme.colors.border.subtle,
            paddingBottom: insets.bottom + theme.spacing.lg,
            maxHeight: '85%',
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: theme.spacing.md }}>
            <View
              style={{
                width: 44,
                height: 5,
                borderRadius: 3,
                backgroundColor: theme.colors.border.strong,
              }}
            />
          </View>
          {title ? (
            <Text variant="subtitle" style={{ paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg }}>
              {title}
            </Text>
          ) : null}
          <ScrollView
            contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.md }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
