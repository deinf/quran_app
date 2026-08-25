import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import type { SurahDetail } from '@/api/types';
import {
  BAR_HEIGHT,
  CollapsingAppBar,
  useFoldedTitleOpacity,
} from '@/components/CollapsingAppBar';
import { useSettings } from '@/store/settings';
import { radius, spacing, type as typeScale } from '@/theme';

export { BAR_HEIGHT };

export const APPBAR_EXPANDED = 248;

export function SurahAppBar({
  surah,
  scrollY,
  folded,
  actions,
}: {
  surah: SurahDetail;
  scrollY: Animated.Value;
  folded: boolean;
  actions: ReactNode;
}) {
  const { colors } = useSettings();
  const router = useRouter();
  const titleOpacity = useFoldedTitleOpacity(scrollY, APPBAR_EXPANDED);

  return (
    <CollapsingAppBar
      scrollY={scrollY}
      expanded={APPBAR_EXPANDED}
      folded={folded}
      squareWhenFolded
      silhouetteScale={0.85}
      body={
        <View style={styles.identity}>
          <Text style={[styles.arabic, { color: colors.onHero }]}>{surah.nama}</Text>
          <Text style={[styles.latin, { color: colors.onHero }]}>{surah.namaLatin}</Text>
          <Text style={[styles.meaning, { color: colors.onHeroFaint }]}>{surah.arti}</Text>
          <View style={styles.chips}>
            <View style={[styles.chip, { backgroundColor: colors.onHeroSoft }]}>
              <Text style={[styles.chipText, { color: colors.onHero }]}>{surah.tempatTurun}</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: colors.onHeroSoft }]}>
              <Text style={[styles.chipText, { color: colors.onHero }]}>
                {surah.jumlahAyat} ayat
              </Text>
            </View>
          </View>
        </View>
      }
      bar={
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            onPress={() => router.back()}
            hitSlop={10}
            style={({ pressed }) => [styles.back, { opacity: pressed ? 0.45 : 1 }]}
          >
            <Ionicons name="arrow-back" size={25} color={colors.onHero} />
          </Pressable>

          <Animated.Text
            numberOfLines={1}
            style={[styles.barTitle, { color: colors.onHero, opacity: titleOpacity }]}
          >
            {surah.namaLatin}
          </Animated.Text>

          <View style={styles.actions}>{actions}</View>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: 'center', gap: 1 },
  arabic: { fontSize: 29, fontFamily: 'Amiri-Regular' },
  latin: typeScale.title,
  meaning: typeScale.caption,
  chips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  chipText: { fontSize: 11.5, fontWeight: '700' },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  barTitle: { ...typeScale.heading, fontSize: 17, flex: 1, textAlign: 'left' },
  actions: { flexDirection: 'row', alignItems: 'center' },
});
