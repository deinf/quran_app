import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MosqueSilhouette } from '@/components/MosqueSilhouette';
import { useSettings } from '@/store/settings';
import { radius, spacing } from '@/theme';

export const BAR_HEIGHT = 52;

export function CollapsingAppBar({
  scrollY,
  expanded,
  stickyHeight = 0,
  folded = false,
  squareWhenFolded = false,
  silhouetteScale = 1,
  silhouetteOpacity = 0.09,
  bar,
  body,
  sticky,
}: {
  scrollY: Animated.Value;
  expanded: number;
  stickyHeight?: number;
  folded?: boolean;
  squareWhenFolded?: boolean;
  silhouetteScale?: number;
  silhouetteOpacity?: number;
  bar: ReactNode;
  body?: ReactNode;
  sticky?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useSettings();

  const barTop = insets.top + BAR_HEIGHT;
  const range = Math.max(1, expanded - barTop - stickyHeight);

  const clamped = scrollY.interpolate({
    inputRange: [0, range],
    outputRange: [0, range],
    extrapolate: 'clamp',
  });
  const panelShift = Animated.multiply(clamped, -1);

  const bodyOpacity = clamped.interpolate({
    inputRange: [0, range * 0.55],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const corner = squareWhenFolded && folded ? 0 : radius.xxl;

  return (
    <Animated.View
      style={[
        styles.panel,
        {
          height: expanded,
          transform: [{ translateY: panelShift }],
          borderBottomLeftRadius: corner,
          borderBottomRightRadius: corner,
        },
      ]}
    >
      <LinearGradient
        colors={colors.heroGradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: bodyOpacity }]}>
          <MosqueSilhouette
            color={colors.onHero}
            scale={silhouetteScale}
            opacity={silhouetteOpacity}
          />
        </Animated.View>
      </LinearGradient>

      {body ? (
        <Animated.View
          style={[styles.body, { top: barTop, bottom: stickyHeight, opacity: bodyOpacity }]}
        >
          {body}
        </Animated.View>
      ) : null}

      {sticky ? <View style={[styles.sticky, { height: stickyHeight }]}>{sticky}</View> : null}

      <Animated.View
        style={[
          styles.bar,
          { paddingTop: insets.top, height: barTop, transform: [{ translateY: clamped }] },
        ]}
      >
        {bar}
      </Animated.View>
    </Animated.View>
  );
}

export function useCollapsingScroll(
  expanded: number,
  { stickyHeight = 0, trackFolded = false }: { stickyHeight?: number; trackFolded?: boolean } = {},
) {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [folded, setFolded] = useState(false);
  const foldedRef = useRef(false);

  const threshold = Math.max(1, expanded - (insets.top + BAR_HEIGHT) - stickyHeight) * 0.9;

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
        ...(trackFolded
          ? {
              listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
                const next = event.nativeEvent.contentOffset.y > threshold;
                if (next === foldedRef.current) return;
                foldedRef.current = next;
                setFolded(next);
              },
            }
          : {}),
      }),
    [scrollY, trackFolded, threshold],
  );

  return { scrollY, onScroll, folded };
}

export function useFoldedTitleOpacity(
  scrollY: Animated.Value,
  expanded: number,
  stickyHeight = 0,
) {
  const insets = useSafeAreaInsets();
  const range = Math.max(1, expanded - (insets.top + BAR_HEIGHT) - stickyHeight);
  return scrollY.interpolate({
    inputRange: [range * 0.6, range],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    overflow: 'hidden',
  },
  body: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
});
