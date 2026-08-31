import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MosqueSilhouette } from '@/components/MosqueSilhouette';
import { tapFeedback } from '@/components/feedback';
import { useSettings } from '@/store/settings';
import { SERIF, TAP_TARGET, radius, spacing, type as typeScale } from '@/theme';

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    icon: 'book-outline',
    title: 'Baca dan pahami',
    body: '114 surah lengkap dengan terjemahan Indonesia, tafsir per ayat, dan kumpulan doa harian.',
  },
  {
    icon: 'headset-outline',
    title: 'Dengarkan murottal',
    body: 'Enam qari pilihan. Putar satu ayat atau seluruh surah, dan ikuti bacaannya di layar.',
  },
  {
    icon: 'cloud-download-outline',
    title: 'Simpan untuk nanti',
    body: 'Unduh audio per ayat atau per surah, lalu dengarkan tanpa kuota di mana pun Anda berada.',
  },
  {
    icon: 'notifications-outline',
    title: 'Tepat waktu',
    body: 'Jadwal shalat sesuai kota Anda, notifikasi adzan, ayat tersimpan, dan riwayat bacaan.',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingScreen() {
  const { colors, setSetting } = useSettings();
  const insets = useSafeAreaInsets();
  const listRef = useRef<Animated.FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);

  const last = index === SLIDES.length - 1;

  const onScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
      useNativeDriver: true,
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const next = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setIndex((current) => (current === next ? current : next));
      },
    }),
  ).current;

  const finish = useCallback(() => {
    tapFeedback();
    setSetting('onboarded', true);
  }, [setSetting]);

  const advance = useCallback(() => {
    if (last) {
      finish();
      return;
    }
    tapFeedback();
    listRef.current?.scrollToOffset({ offset: (index + 1) * SCREEN_WIDTH, animated: true });
  }, [last, index, finish]);

  return (
    <View style={styles.fill}>
      <StatusBar style="light" />
      <LinearGradient
        colors={colors.heroGradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      >
        <MosqueSilhouette color={colors.onHero} opacity={0.07} />
      </LinearGradient>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Lewati perkenalan"
        onPress={finish}
        hitSlop={10}
        style={({ pressed }) => [
          styles.skip,
          { top: insets.top + spacing.sm, opacity: pressed ? 0.5 : 1 },
        ]}
      >
        <Text style={[styles.skipText, { color: colors.onHeroMuted }]}>Lewati</Text>
      </Pressable>

      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.pager}
        renderItem={({ item }) => (
          <View style={[styles.slide, { paddingTop: insets.top + 72 }]}>
            <View style={[styles.badge, { backgroundColor: colors.onHeroSoft }]}>
              <Ionicons name={item.icon} size={40} color={colors.onHero} />
            </View>
            <Text style={[styles.title, { color: colors.onHero }]}>{item.title}</Text>
            <Text style={[styles.body, { color: colors.onHeroMuted }]}>{item.body}</Text>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.dots}>
          {SLIDES.map((slide, dotIndex) => (
            <Dot key={slide.title} scrollX={scrollX} index={dotIndex} color={colors.onHero} />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={last ? 'Mulai membaca' : 'Lanjut'}
          onPress={advance}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: colors.onHero, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Text style={[styles.ctaText, { color: colors.heroGradient[1] }]}>
            {last ? 'Mulai membaca' : 'Lanjut'}
          </Text>
          <Ionicons
            name={last ? 'book' : 'arrow-forward'}
            size={18}
            color={colors.heroGradient[1]}
          />
        </Pressable>
      </View>
    </View>
  );
}

function Dot({
  scrollX,
  index,
  color,
}: {
  scrollX: Animated.Value;
  index: number;
  color: string;
}) {
  const distance = [
    (index - 1) * SCREEN_WIDTH,
    index * SCREEN_WIDTH,
    (index + 1) * SCREEN_WIDTH,
  ];
  const scale = scrollX.interpolate({
    inputRange: distance,
    outputRange: [1, 1.9, 1],
    extrapolate: 'clamp',
  });
  const opacity = scrollX.interpolate({
    inputRange: distance,
    outputRange: [0.3, 1, 0.3],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: color, opacity, transform: [{ scale }] }]}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pager: { flex: 1 },

  skip: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 2,
    height: TAP_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  skipText: { ...typeScale.heading, fontSize: 14 },

  slide: {
    width: SCREEN_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: radius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...typeScale.display, fontFamily: SERIF, textAlign: 'center' },
  body: { ...typeScale.body, textAlign: 'center', maxWidth: 320 },

  footer: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: radius.pill },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: TAP_TARGET + 4,
    borderRadius: radius.pill,
  },
  ctaText: typeScale.heading,
});
