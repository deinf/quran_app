import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native';

import { getSurah } from '@/api/client';
import {
  QARI,
  pickAudio,
  type Ayah,
  type QariId,
  type SurahDetail,
  type SurahLink,
} from '@/api/types';
import { useResource } from '@/api/useResource';
import { usePlayerControls, type Track } from '@/audio/player';
import { AyahCard } from '@/components/AyahCard';
import { MiniPlayer } from '@/components/MiniPlayer';
import { MosqueSilhouette } from '@/components/MosqueSilhouette';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useCollapsingScroll } from '@/components/CollapsingAppBar';
import { APPBAR_EXPANDED, SurahAppBar } from '@/components/SurahAppBar';
import { QariSheet } from '@/components/QariSheet';
import { useToast } from '@/components/toast';
import {
  ErrorState,
  IconButton,
  MarqueeText,
  Loading,
  OfflineBanner,
  ProgressBar,
  elevation,
  stripHtml,
} from '@/components/ui';
import { useOfflineAudio } from '@/offline/audio';
import { useIsOffline } from '@/offline/network';
import { useLibrary } from '@/store/library';
import { useSettings } from '@/store/settings';
import { HAIRLINE, TAP_TARGET, radius, spacing, type as typeScale } from '@/theme';

export default function SurahScreen() {
  const params = useLocalSearchParams<{ nomor: string; ayah?: string }>();
  const surahNumber = Number(params.nomor);
  const targetAyah = params.ayah ? Number(params.ayah) : undefined;

  const router = useRouter();
  const { settings, setSetting, colors } = useSettings();
  const { isBookmarked, toggleBookmark, setLastRead } = useLibrary();
  const { playQueue, current } = usePlayerControls();
  const toast = useToast();
  const offline = useIsOffline();
  const { storedCount, hasLocalSurah, localUri, active } = useOfflineAudio();

  const listRef = useRef<FlatList<Ayah>>(null);
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  const loader = useCallback((force: boolean) => getSurah(surahNumber, force), [surahNumber]);
  const { data, error, loading, reload } = useResource(loader, [surahNumber]);

  const surahRef = useRef<SurahDetail | undefined>(undefined);
  surahRef.current = data;
  const visibleAyah = useRef<number | undefined>(undefined);

  const qariNameOf = useCallback(
    (id: QariId) => QARI.find((q) => q.id === id)?.name ?? 'Qari',
    [],
  );

  const storedHere = data ? storedCount(data.nomor, settings.qari) : 0;
  const downloadedHere = !!data && storedHere >= data.jumlahAyat;

  const buildTracks = useCallback(
    (detail: SurahDetail, qari: QariId): Track[] => {
      const useLocal = hasLocalSurah(detail.nomor, qari);
      const name = qariNameOf(qari);
      return detail.ayat.flatMap((ayah) => {
        const uri =
          (useLocal ? localUri(detail.nomor, ayah.nomorAyat, qari) : undefined) ??
          pickAudio(ayah.audio, qari);
        if (!uri) return [];
        return [
          {
            uri,
            surah: detail.nomor,
            surahName: detail.namaLatin,
            ayah: ayah.nomorAyat,
            qariName: name,
          },
        ];
      });
    },
    [hasLocalSurah, localUri, qariNameOf],
  );

  const tracks = useMemo<Track[]>(
    () => (data ? buildTracks(data, settings.qari) : []),
    [data, settings.qari, buildTracks],
  );

  const playFrom = useCallback(
    (ayahNumber: number) => {
      const index = tracks.findIndex((track) => track.ayah === ayahNumber);
      if (index >= 0) playQueue(tracks, index, { toggle: true });
    },
    [tracks, playQueue],
  );

  const openAyahTafsir = useCallback(
    (ayahNumber: number) => router.push(`/tafsir/${surahNumber}?ayah=${ayahNumber}`),
    [router, surahNumber],
  );

  const openShare = useCallback(
    (ayahNumber: number) => router.push(`/share?surah=${surahNumber}&ayah=${ayahNumber}`),
    [router, surahNumber],
  );

  const toggleAyahBookmark = useCallback(
    (ayah: Ayah) => {
      const surah = surahRef.current;
      if (!surah) return;
      toggleBookmark({
        surah: surah.nomor,
        ayah: ayah.nomorAyat,
        surahName: surah.namaLatin,
        arabic: ayah.teksArab,
        preview: ayah.teksIndonesia,
      });
    },
    [toggleBookmark],
  );

  const playFullSurah = useCallback(() => {
    if (!data) return;
    const uri = pickAudio(data.audioFull, settings.qari);
    if (!uri) {
      toast.show('Murottal tidak tersedia untuk qari ini', {
        tone: 'danger',
        icon: 'alert-circle',
      });
      return;
    }
    playQueue(
      [
        {
          uri,
          surah: data.nomor,
          surahName: data.namaLatin,
          qariName: qariNameOf(settings.qari),
        },
      ],
      0,
    );
  }, [data, settings.qari, qariNameOf, playQueue, toast]);

  const playAllAyat = useCallback(() => {
    if (!tracks.length) {
      toast.show('Audio tidak tersedia untuk qari ini', { tone: 'danger', icon: 'alert-circle' });
      return;
    }
    playQueue(tracks, 0);
  }, [tracks, playQueue, toast]);

  const [qariSheet, setQariSheet] = useState(false);

  const { scrollY, onScroll, folded } = useCollapsingScroll(APPBAR_EXPANDED, {
    trackFolded: true,
  });

  const pendingJump = useRef<
    { index: number; lastTop: number; stalls: number } | undefined
  >(undefined);

  const scrollToIndex = useCallback((index: number, animated: boolean) => {
    listRef.current?.scrollToIndex({ index, viewPosition: JUMP_VIEW_POSITION, animated });
  }, []);

  const requestJump = useCallback(
    (index: number, animated: boolean) => {
      pendingJump.current = { index, lastTop: -1, stalls: 0 };
      scrollToIndex(index, animated);
    },
    [scrollToIndex],
  );

  const jumpedTo = useRef<string>('');
  useEffect(() => {
    if (!data || !targetAyah) return;
    const token = `${surahNumber}:${targetAyah}`;
    if (jumpedTo.current === token) return;
    const index = data.ayat.findIndex((a) => a.nomorAyat === targetAyah);
    if (index < 0) return;
    jumpedTo.current = token;
    const timer = setTimeout(() => requestJump(index, false), 250);
    return () => clearTimeout(timer);
  }, [data, targetAyah, surahNumber, requestJump]);

  useEffect(() => {
    if (!settings.followPlayback || !data) return;
    if (current?.surah !== surahNumber || current.ayah === undefined) return;
    const index = data.ayat.findIndex((a) => a.nomorAyat === current.ayah);
    if (index >= 0) requestJump(index, true);
  }, [current?.surah, current?.ayah, settings.followPlayback, data, surahNumber, requestJump]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const pending = pendingJump.current;
    if (pending) {
      if (viewableItems.some((token) => token.index === pending.index)) {
        pendingJump.current = undefined;
        return;
      }

      const top = viewableItems[0]?.index ?? -1;
      const advanced = Math.abs(pending.index - top) < Math.abs(pending.index - pending.lastTop);
      pending.stalls = advanced || pending.lastTop === -1 ? 0 : pending.stalls + 1;
      pending.lastTop = top;

      if (pending.stalls >= MAX_JUMP_STALLS) {
        pendingJump.current = undefined;
        return;
      }

      listRef.current?.scrollToIndex({
        index: pending.index,
        viewPosition: JUMP_VIEW_POSITION,
        animated: false,
      });
      return;
    }

    const first = viewableItems[0]?.item as Ayah | undefined;
    if (first) visibleAyah.current = first.nomorAyat;
  }).current;

  useFocusEffect(
    useCallback(
      () => () => {
        const surah = surahRef.current;
        const ayah = visibleAyah.current;
        if (!surah || !ayah) return;
        setLastRead({
          surah: surah.nomor,
          ayah,
          surahName: surah.namaLatin,
          totalAyah: surah.jumlahAyat,
        });
      },
      [setLastRead],
    ),
  );

  const barActions = data ? (
    <SurahActions
      surah={data}
      canPlay={tracks.length > 0}
      downloaded={downloadedHere}
      stored={storedHere}
      onPlayAyahs={playAllAyat}
      onPlayFull={playFullSurah}
      onOpenDownload={() => router.push(`/unduhan/${data.nomor}`)}
      tint={colors.onHero}
      accentTint={colors.accent}
    />
  ) : null;

  const shell = (children: ReactNode) => (
    <View style={styles.fill}>
      <ScreenHeader />
      {children}
    </View>
  );

  if (loading && !data) return shell(<Loading label="Memuat surah…" />);
  if (error && !data) return shell(<ErrorState message={error} onRetry={reload} />);
  if (!data) return shell(null);

  return (
    <View style={styles.fill}>
      <SurahAppBar surah={data} scrollY={scrollY} folded={folded} actions={barActions} />
      <Animated.FlatList
        onScroll={onScroll}
        scrollEventThrottle={16}
        ref={listRef}
        data={data.ayat}
        keyExtractor={(item) => String(item.nomorAyat)}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="never"
        initialNumToRender={10}
        windowSize={21}
        removeClippedSubviews
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onScrollToIndexFailed={({ index, averageItemLength }) => {
          if (averageItemLength > 0) {
            listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: false });
          }
          setTimeout(() => scrollToIndex(index, false), 120);
        }}
        ListHeaderComponent={
          <SurahHeader
            surah={data}
            descriptionOpen={descriptionOpen}
            onToggleDescription={() => setDescriptionOpen((open) => !open)}
            onOpenTafsir={() => router.push(`/tafsir/${data.nomor}`)}
            offline={offline}
            downloaded={downloadedHere}
            stored={storedHere}
            qariName={qariNameOf(settings.qari)}
            onChangeQari={() => setQariSheet(true)}
            downloadProgress={
              active && active.surah === data.nomor && active.qari === settings.qari ? active : undefined
            }
          />
        }
        renderItem={({ item }) => (
          <AyahCard
            ayah={item}
            surahName={data.namaLatin}
            active={current?.surah === data.nomor && current.ayah === item.nomorAyat}
            bookmarked={isBookmarked(data.nomor, item.nomorAyat)}
            onPlay={playFrom}
            onToggleBookmark={toggleAyahBookmark}
            onOpenTafsir={openAyahTafsir}
            onShare={openShare}
          />
        )}
        ListFooterComponent={
          <SurahNavigation
            previous={data.suratSebelumnya}
            next={data.suratSelanjutnya}
            onSelect={(nomor) => router.replace(`/surah/${nomor}`)}
          />
        }
      />
      <MiniPlayer edgeToBottom />

      <QariSheet
        visible={qariSheet}
        onClose={() => setQariSheet(false)}
        onSelect={(qari) => {
          setQariSheet(false);
          setSetting('qari', qari);
        }}
      />
    </View>
  );
}

function SurahActions({
  surah,
  canPlay,
  downloaded,
  stored = 0,
  onPlayAyahs,
  onPlayFull,
  onOpenDownload,
  tint,
  accentTint,
}: {
  surah: SurahDetail;
  canPlay: boolean;
  downloaded: boolean;
  stored?: number;
  onPlayAyahs: () => void;
  onPlayFull: () => void;
  onOpenDownload: () => void;
  tint: string;
  accentTint: string;
}) {
  return (
    <>
      <IconButton
        name="play"
        label={`Putar semua ayat surah ${surah.namaLatin}`}
        size={20}
        color={tint}
        disabled={!canPlay}
        onPress={onPlayAyahs}
      />
      <IconButton
        name="musical-notes-outline"
        label={`Murottal surah ${surah.namaLatin}`}
        size={20}
        color={tint}
        disabled={!canPlay}
        onPress={onPlayFull}
      />
      <IconButton
        name={downloaded ? 'checkmark-circle' : 'download-outline'}
        label={
          downloaded
            ? `Tersedia offline. Buka pengaturan unduhan surah ${surah.namaLatin}`
            : stored > 0
              ? `Unduhan ${stored} dari ${surah.jumlahAyat} ayat. Buka pengaturan unduhan`
              : `Unduh audio surah ${surah.namaLatin}`
        }
        size={20}
        color={downloaded ? accentTint : tint}
        onPress={onOpenDownload}
      />
    </>
  );
}

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 40, minimumViewTime: 120 };

const JUMP_VIEW_POSITION = 0.08;

const MAX_JUMP_STALLS = 3;

const SURAH_WITHOUT_LEADING_BASMALAH = new Set([1, 9]);

function SurahHeader({
  surah,
  descriptionOpen,
  onToggleDescription,
  onOpenTafsir,
  offline,
  downloaded,
  stored,
  downloadProgress,
  qariName,
  onChangeQari,
}: {
  surah: SurahDetail;
  descriptionOpen: boolean;
  onToggleDescription: () => void;
  onOpenTafsir: () => void;
  offline: boolean;
  downloaded: boolean;
  stored: number;
  downloadProgress: { done: number; total: number } | undefined;
  qariName: string;
  onChangeQari: () => void;
}) {
  const { colors } = useSettings();
  const description = useMemo(() => stripHtml(surah.deskripsi), [surah.deskripsi]);

  return (
    <View style={styles.header}>
      <View style={[styles.card, { backgroundColor: colors.surface }, elevation(colors.shadow, 1)]}>
        {downloadProgress ? (
          <View style={styles.cardProgress}>
            <ProgressBar value={downloadProgress.done} total={downloadProgress.total} />
          </View>
        ) : stored > 0 && !downloaded ? (
          <View style={styles.cardProgress}>
            <ProgressBar value={stored} total={surah.jumlahAyat} />
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Qari ${qariName}. Ketuk untuk mengubah`}
          onPress={onChangeQari}
          style={({ pressed }) => [
            styles.qariRow,
            { borderBottomColor: colors.divider },
            pressed ? { backgroundColor: colors.surfaceAlt } : null,
          ]}
        >
          <Ionicons name="person-circle-outline" size={19} color={colors.textMuted} />
          <Text style={[styles.qariLabel, { color: colors.textMuted }]}>Qari</Text>
          <MarqueeText style={[styles.qariName, { color: colors.text }]}>
            {qariName}
          </MarqueeText>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </Pressable>

        <View style={styles.section}>
          <Text
            numberOfLines={descriptionOpen ? undefined : 2}
            style={[styles.descriptionText, { color: colors.textMuted }]}
          >
            {description}
          </Text>
          <View style={styles.descriptionFooter}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                descriptionOpen ? 'Tutup deskripsi surah' : 'Baca deskripsi surah selengkapnya'
              }
              onPress={onToggleDescription}
              hitSlop={8}
            >
              <Text style={[styles.descriptionToggle, { color: colors.primary }]}>
                {descriptionOpen ? 'Tutup' : 'Baca selengkapnya'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Tafsir surah ${surah.namaLatin}`}
              onPress={onOpenTafsir}
              hitSlop={8}
              style={styles.tafsirLink}
            >
              <Ionicons name="book-outline" size={15} color={colors.primary} />
              <Text style={[styles.descriptionToggle, { color: colors.primary }]}>Tafsir surah</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {offline ? <OfflineBanner /> : null}

      {!SURAH_WITHOUT_LEADING_BASMALAH.has(surah.nomor) ? (
        <Text style={[styles.basmalah, { color: colors.arabic }]}>
          بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
        </Text>
      ) : null}
    </View>
  );
}

function SurahNavigation({
  previous,
  next,
  onSelect,
}: {
  previous: SurahLink;
  next: SurahLink;
  onSelect: (nomor: number) => void;
}) {
  const { colors } = useSettings();
  return (
    <View style={styles.navigation}>
      {previous ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onSelect(previous.nomor)}
          style={({ pressed }) => [
            styles.navCard,
            { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
          <View>
            <Text style={[styles.navLabel, { color: colors.textFaint }]}>Sebelumnya</Text>
            <Text style={[styles.navName, { color: colors.text }]}>{previous.namaLatin}</Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.navSpacer} />
      )}
      {next ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onSelect(next.nomor)}
          style={({ pressed }) => [
            styles.navCard,
            styles.navCardRight,
            { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={styles.navTextRight}>
            <Text style={[styles.navLabel, { color: colors.textFaint }]}>Selanjutnya</Text>
            <Text style={[styles.navName, { color: colors.text }]}>{next.namaLatin}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
      ) : (
        <View style={styles.navSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: APPBAR_EXPANDED + spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  header: { gap: spacing.md },
  card: { borderRadius: radius.xl, overflow: 'hidden' },
  cardProgress: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  section: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  qariRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: HAIRLINE,
  },
  qariLabel: typeScale.caption,
  qariName: typeScale.heading,
  heroTitle: typeScale.title,
  heroMeaning: typeScale.caption,
  descriptionText: { ...typeScale.caption, lineHeight: 19 },
  descriptionFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  descriptionToggle: { ...typeScale.caption, fontWeight: '700' },
  tafsirLink: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  basmalah: {
    fontSize: 24,
    fontFamily: 'AmiriQuran-Regular',
    lineHeight: 52,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  navigation: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  navCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  navCardRight: { justifyContent: 'flex-end' },
  navSpacer: { flex: 1 },
  navTextRight: { alignItems: 'flex-end' },
  navLabel: { ...typeScale.label, textTransform: 'uppercase', letterSpacing: 0.6 },
  navName: typeScale.heading,
});
