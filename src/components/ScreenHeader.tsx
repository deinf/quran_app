import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/store/settings';
import { motion, spacing, type as typeScale } from '@/theme';

const SLOT = 44;

export function ScreenHeader({
  title,
  right,
}: {
  title?: string;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();

  const shown = title !== undefined || right !== undefined;
  const fade = useRef(new Animated.Value(shown ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: shown ? 1 : 0,
      duration: motion.fast,
      easing: motion.standard,
      useNativeDriver: true,
    }).start();
  }, [shown, fade]);

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + spacing.xs, backgroundColor: colors.surface },
      ]}
    >
      <View style={styles.slot}>
        {canGoBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            onPress={() => router.back()}
            hitSlop={10}
            style={({ pressed }) => [styles.back, { opacity: pressed ? 0.45 : 1 }]}
          >
            <Ionicons name="arrow-back" size={25} color={colors.text} />
          </Pressable>
        ) : null}
      </View>

      <Animated.Text
        numberOfLines={1}
        style={[styles.title, { color: colors.text, opacity: fade }]}
      >
        {title}
      </Animated.Text>

      <Animated.View style={[styles.rightSlot, { opacity: fade }]}>{right}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  slot: { width: SLOT, alignItems: 'center' },
  rightSlot: { minWidth: SLOT, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  back: { width: SLOT, height: SLOT, alignItems: 'center', justifyContent: 'center' },
  title: { ...typeScale.heading, fontSize: 17, flex: 1, textAlign: 'center' },
});
