import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { getDailyVerse } from '@/api/dailyVerse';
import { QARI, pickAudio } from '@/api/types';
import { useResource } from '@/api/useResource';
import { usePlayerControls } from '@/audio/player';
import { successFeedback, tapFeedback } from '@/components/feedback';
import { useCollapsingScroll } from '@/components/CollapsingAppBar';
import {
  HOME_HERO_EXPANDED,
  HOME_STRIP_HEIGHT,
  PrayerHero,
} from '@/components/PrayerHero';
import { SavedAyahCard } from '@/components/SavedAyahCard';
import { useToast } from '@/components/toast';
import { IconButton, OfflineBanner, elevation, type IconName } from '@/components/ui';
import { useOfflineAudio } from '@/offline/audio';
import { useIsOffline } from '@/offline/network';
import { useLibrary } from '@/store/library';
import { useSettings } from '@/store/settings';
import { ARABIC_FONTS, HAIRLINE, SERIF, TAP_TARGET, radius, spacing, type as typeScale } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, settings } = useSettings();
  const {
    bookmarks,
    lastRead,
    ready: libraryReady,
    isBookmarked,
    toggleBookmark,
    removeBookmark,
  } = useLibrary();
  const { playQueue } = usePlayerControls();
  const { localUri } = useOfflineAudio();
  const toast = useToast();
  const offline = useIsOffline();

  const { data: daily, error, loading, reload } = useResource(getDailyVerse, []);

  const qariName = useMemo(
    () => QARI.find((q) => q.id === settings.qari)?.name ?? 'Qari',
    [settings.qari],
  );

  const playDaily = useCallback(() => {
    if (!daily) return;
    const uri =
      localUri(daily.surah, daily.ayah.nomorAyat, settings.qari) ??
      pickAudio(daily.ayah.audio, settings.qari);
    if (!uri) return;
    playQueue(
      [
        {
          uri,
          surah: daily.surah,
          surahName: daily.surahName,
          ayah: daily.ayah.nomorAyat,
          qariName,
        },
      ],
      0,
      { toggle: true },
    );
  }, [daily, settings.qari, qariName, playQueue, localUri]);

  const { scrollY, onScroll } = useCollapsingScroll(HOME_HERO_EXPANDED, {
    stickyHeight: HOME_STRIP_HEIGHT,
  });

  const savedPreview = bookmarks.slice(0, 2);
  const font = ARABIC_FONTS[settings.arabicFont];

  return (
    <View style={styles.fill}>
      <StatusBar style="light" />
      <PrayerHero scrollY={scrollY} />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.body}>
        <View style={[styles.grid, { backgroundColor: colors.surface }, elevation(colors.shadow, 2)]}>
          <GridItem
            icon="reader-outline"
            label="Terakhir"
            onPress={() =>
              router.push(lastRead ? `/surah/${lastRead.surah}?ayah=${lastRead.ayah}` : '/surah-list')
            }
          />
          <GridItem icon="book-outline" label="Al-Qur’an" onPress={() => router.push('/surah-list')} />
          <GridItem icon="hand-left-outline" label="Doa" onPress={() => router.push('/doa')} />
          <GridItem icon="time-outline" label="Jadwal" onPress={() => router.push('/shalat')} />
          <GridItem icon="bookmark-outline" label="Tersimpan" onPress={() => router.push('/bookmarks')} />
          <GridItem icon="refresh-outline" label="Riwayat" onPress={() => router.push('/history')} />
          <GridItem icon="cloud-download-outline" label="Unduh" onPress={() => router.push('/unduhan')} />
          <GridItem icon="options-outline" label="Pengaturan" onPress={() => router.push('/settings')} />
        </View>

        {offline ? <OfflineBanner /> : null}

        {!libraryReady ? (
          <View style={[styles.progressCard, { backgroundColor: colors.surfaceContainer }]} />
        ) : lastRead ? (
          <View
            style={[styles.progressCard, { backgroundColor: colors.surface }, elevation(colors.shadow, 1)]}
          >
            <View style={styles.progressHead}>
              <Text style={[styles.progressTitle, { color: colors.text }]}>Lanjutkan Membaca</Text>
              <View style={[styles.pct, { backgroundColor: colors.primary }]}>
                <Text style={[styles.pctText, { color: colors.primaryText }]}>
                  {Math.round((lastRead.ayah / Math.max(1, lastRead.totalAyah)) * 100)}%
                </Text>
              </View>
            </View>
            <Text style={[styles.progressBody, { color: colors.textMuted }]}>
              Surah {lastRead.surahName} · ayat {lastRead.ayah} dari {lastRead.totalAyah}
            </Text>
            <TickBar value={lastRead.ayah} total={lastRead.totalAyah} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Lanjutkan ${lastRead.surahName} ayat ${lastRead.ayah}`}
              onPress={() => {
                tapFeedback();
                router.push(`/surah/${lastRead.surah}?ayah=${lastRead.ayah}`);
              }}
              style={({ pressed }) => [
                styles.progressCta,
                { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.progressCtaLabel, { color: colors.onAccent }]}>
                Lanjutkan ke ayat {lastRead.ayah}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={[styles.progressCard, { backgroundColor: colors.surface }, elevation(colors.shadow, 1)]}
          >
            <Text style={[styles.progressTitle, { color: colors.text }]}>Mulai Membaca</Text>
            <Text style={[styles.progressBody, { color: colors.textMuted }]}>
              Pilih surah untuk memulai. Posisi bacaanmu tersimpan otomatis.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                tapFeedback();
                router.push('/surah-list');
              }}
              style={({ pressed }) => [
                styles.progressCta,
                { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.progressCtaLabel, { color: colors.onAccent }]}>
                Buka daftar surah
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ayat Harian</Text>
          {daily ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              style={styles.headAction}
              onPress={() => router.push(`/share?surah=${daily.surah}&ayah=${daily.ayah.nomorAyat}`)}
            >
              <Text style={[styles.headActionText, { color: colors.primary }]}>Bagikan</Text>
              <Ionicons name="share-outline" size={15} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>

        {loading && !daily ? (
          <View style={[styles.versePlaceholder, { backgroundColor: colors.surfaceContainer }]} />
        ) : error && !daily ? (
          <Pressable
            accessibilityRole="button"
            onPress={reload}
            style={[styles.verseCard, { backgroundColor: colors.surface }, elevation(colors.shadow, 1)]}
          >
            <Text style={[styles.verseTranslation, { color: colors.textMuted }]}>
              Ayat harian belum dapat dimuat. Ketuk untuk mencoba lagi.
            </Text>
          </Pressable>
        ) : daily ? (
          <View
            style={[styles.verseCard, { backgroundColor: colors.surface }, elevation(colors.shadow, 1)]}
          >
            <View style={styles.verseTop}>
              <View style={[styles.verseChip, { backgroundColor: colors.primarySoft }]}>
                <Text numberOfLines={1} style={[styles.verseChipText, { color: colors.onPrimarySoft }]}>
                  {daily.surahName} · {daily.surah}:{daily.ayah.nomorAyat}
                </Text>
              </View>
              <IconButton
                name={isBookmarked(daily.surah, daily.ayah.nomorAyat) ? 'bookmark' : 'bookmark-outline'}
                label="Simpan ayat harian"
                size={19}
                color={
                  isBookmarked(daily.surah, daily.ayah.nomorAyat) ? colors.accent : colors.textFaint
                }
                haptic={false}
                onPress={() => {
                  const saved = toggleBookmark({
                    surah: daily.surah,
                    ayah: daily.ayah.nomorAyat,
                    surahName: daily.surahName,
                    arabic: daily.ayah.teksArab,
                    preview: daily.ayah.teksIndonesia,
                  });
                  if (saved) {
                    successFeedback();
                    toast.show('Ayat disimpan ke Tersimpan', { tone: 'success', icon: 'bookmark' });
                  } else {
                    tapFeedback();
                    toast.show('Penanda dihapus', { tone: 'neutral', icon: 'bookmark-outline' });
                  }
                }}
              />
            </View>

            <Text
              style={[
                styles.verseArabic,
                { color: colors.arabic, fontFamily: font.key, lineHeight: 27 * font.lineHeightRatio },
              ]}
            >
              {daily.ayah.teksArab}
            </Text>

            <Text style={[styles.verseTranslation, { color: colors.textMuted }]}>
              “{daily.ayah.teksIndonesia}”
            </Text>

            <View style={[styles.verseActions, { borderTopColor: colors.divider }]}>
              <VerseAction
                icon="book-outline"
                label="Tafsir"
                onPress={() => router.push(`/tafsir/${daily.surah}?ayah=${daily.ayah.nomorAyat}`)}
              />
              <View style={[styles.verseRule, { backgroundColor: colors.divider }]} />
              <VerseAction icon="play" label="Putar" onPress={playDaily} />
            </View>
          </View>
        ) : null}

        {libraryReady && savedPreview.length ? (
          <>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Ayat Tersimpan</Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => router.push('/bookmarks')}
              >
                <Text style={[styles.headActionText, { color: colors.primary }]}>Lihat semua</Text>
              </Pressable>
            </View>
            {savedPreview.map((bookmark) => (
              <SavedAyahCard
                key={`${bookmark.surah}:${bookmark.ayah}`}
                bookmark={bookmark}
                onOpen={() => router.push(`/surah/${bookmark.surah}?ayah=${bookmark.ayah}`)}
                onRemove={() => removeBookmark(bookmark.surah, bookmark.ayah)}
                onShare={() => router.push(`/share?surah=${bookmark.surah}&ayah=${bookmark.ayah}`)}
              />
            ))}
          </>
          ) : null}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

function GridItem({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useSettings();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [styles.gridItem, { opacity: pressed ? 0.55 : 1 }]}
    >
      <View style={[styles.gridIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={21} color={colors.onPrimarySoft} />
      </View>
      <Text numberOfLines={1} style={[styles.gridLabel, { color: colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function VerseAction({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useSettings();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [styles.verseAction, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={[styles.verseActionLabel, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

const TICKS = 34;

function TickBar({ value, total }: { value: number; total: number }) {
  const { colors } = useSettings();
  const filled = total > 0 ? Math.round(Math.min(1, value / total) * TICKS) : 0;
  return (
    <View style={styles.ticks}>
      {Array.from({ length: TICKS }, (_, i) => (
        <View
          key={i}
          style={[styles.tick, { backgroundColor: i < filled ? colors.primary : colors.surfaceAlt }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingTop: HOME_HERO_EXPANDED + spacing.md, paddingBottom: spacing.xxl },
  body: { paddingHorizontal: spacing.lg, gap: spacing.md },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: radius.xxl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  gridItem: { width: '25%', alignItems: 'center', gap: 7, paddingVertical: spacing.sm },
  gridIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: { ...typeScale.caption, fontSize: 11.5, fontWeight: '600' },

  progressCard: { borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm, minHeight: 150 },
  progressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTitle: typeScale.title,
  pct: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  pctText: { ...typeScale.label, fontVariant: ['tabular-nums'] },
  progressBody: typeScale.caption,
  ticks: { flexDirection: 'row', alignItems: 'center', gap: 2, marginVertical: spacing.xs },
  tick: { flex: 1, height: 18, borderRadius: 1.5 },
  progressCta: {
    minHeight: TAP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  progressCtaLabel: { ...typeScale.heading, fontWeight: '700' },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
  },
  sectionTitle: { ...typeScale.title, fontFamily: SERIF },
  headAction: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  headActionText: { ...typeScale.caption, fontWeight: '700' },

  verseCard: { borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  versePlaceholder: { borderRadius: radius.xl, minHeight: 250 },
  verseTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  verseChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    flexShrink: 1,
  },
  verseChipText: { ...typeScale.caption, fontWeight: '700' },
  verseArabic: { fontSize: 27, textAlign: 'right', writingDirection: 'rtl', marginTop: spacing.xs },
  verseTranslation: { ...typeScale.body, fontStyle: 'italic' },
  verseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: HAIRLINE,
  },
  verseAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 34,
  },
  verseActionLabel: { ...typeScale.caption, fontWeight: '700' },
  verseRule: { width: HAIRLINE, height: 22 },
});
