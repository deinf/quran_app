import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { getSurahList } from '@/api/client';
import type { SurahSummary } from '@/api/types';
import { useResource } from '@/api/useResource';
import {
  CollapsingAppBar,
  useCollapsingScroll,
  useFoldedTitleOpacity,
} from '@/components/CollapsingAppBar';
import { EmptyState, ErrorState, Loading, OfflineBanner, SearchField } from '@/components/ui';
import { tapFeedback } from '@/components/feedback';
import { useOfflineAudio } from '@/offline/audio';
import { useIsOffline } from '@/offline/network';
import { useColors, useSettings } from '@/store/settings';
import { SERIF, radius, spacing, type as typeScale } from '@/theme';

const EXPANDED = 214;

const SEARCH_STICKY = 72;

export default function SurahListScreen() {
  const colors = useColors();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const offline = useIsOffline();
  const { data, error, loading, fromCache, reload } = useResource(getSurahList, []);

  const reference = useMemo(() => parseReference(data ?? [], query), [data, query]);
  const results = useMemo(
    () => filterSurah(data ?? [], query, reference?.surah.nomor),
    [data, query, reference],
  );

  const jump = useCallback(
    (target: Reference) => {
      tapFeedback();
      setQuery('');
      router.push(
        target.ayah === undefined
          ? `/surah/${target.surah.nomor}`
          : `/surah/${target.surah.nomor}?ayah=${target.ayah}`,
      );
    },
    [router],
  );

  const { scrollY, onScroll, folded } = useCollapsingScroll(EXPANDED, {
    stickyHeight: SEARCH_STICKY,
    trackFolded: true,
  });
  const titleOpacity = useFoldedTitleOpacity(scrollY, EXPANDED, SEARCH_STICKY);

  const totalAyat = useMemo(
    () => (data ?? []).reduce((sum, surah) => sum + surah.jumlahAyat, 0),
    [data],
  );

  const header = (
    <CollapsingAppBar
      scrollY={scrollY}
      expanded={EXPANDED}
      stickyHeight={SEARCH_STICKY}
      folded={folded}
      squareWhenFolded
      silhouetteScale={0.7}
      silhouetteOpacity={0.05}
      body={
        <View style={styles.heroText}>
          <Text style={[styles.heroTitle, { color: colors.onHero }]}>Al-Qur’an</Text>
          <Text style={[styles.heroMeta, { color: colors.onHeroFaint }]}>
            {data ? `114 surah · ${totalAyat.toLocaleString('id-ID')} ayat` : 'Memuat…'}
          </Text>
        </View>
      }
      sticky={
        <View style={styles.searchWrap}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder="Cari surah, arti, atau 18:23"
            returnKeyType={reference ? 'go' : 'search'}
            onSubmitEditing={reference ? () => jump(reference) : undefined}
          />
        </View>
      }
      bar={
        <Animated.Text
          numberOfLines={1}
          style={[styles.barTitle, { color: colors.onHero, opacity: titleOpacity }]}
        >
          Al-Qur’an
        </Animated.Text>
      }
    />
  );

  const shell = (children: ReactNode) => (
    <View style={styles.fill}>
      {header}
      {children}
    </View>
  );

  if (loading && !data) return shell(<Loading label="Memuat daftar surah…" />);
  if (error && !data) return shell(<ErrorState message={error} onRetry={reload} />);

  return shell(
    <Animated.FlatList
      data={results}
      keyExtractor={(item) => String(item.nomor)}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.listContent}
      onScroll={onScroll}
      scrollEventThrottle={16}
      ListHeaderComponent={
        <>
          {offline || (fromCache && !offline) ? (
            <View style={styles.notices}>
              {offline ? <OfflineBanner /> : null}
              {fromCache && !offline ? (
                <View style={styles.offlineNote}>
                  <Ionicons name="cloud-offline-outline" size={13} color={colors.textFaint} />
                  <Text style={[styles.offlineText, { color: colors.textFaint }]}>
                    Ditampilkan dari salinan offline
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {reference ? (
            <JumpCard reference={reference} onPress={() => jump(reference)} />
          ) : null}
        </>
      }
      renderItem={({ item, index }) => (
        <>
          {index > 0 ? (
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          ) : null}
          <SurahRow surah={item} onPress={() => router.push(`/surah/${item.nomor}`)} />
        </>
      )}
      ListEmptyComponent={
        reference ? null : (
          <EmptyState
            icon="search-outline"
            title="Tidak ditemukan"
            message={`Tidak ada surah yang cocok dengan “${query}”.`}
          />
        )
      }
      onRefresh={reload}
      refreshing={loading}
    />,
  );
}

function SurahRow({ surah, onPress }: { surah: SurahSummary; onPress: () => void }) {
  const { colors, settings } = useSettings();
  const { storedCount } = useOfflineAudio();
  const offlineReady = storedCount(surah.nomor, settings.qari) >= surah.jumlahAyat;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Surah ${surah.namaLatin}, ${surah.jumlahAyat} ayat`}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      android_ripple={{ color: colors.surfaceAlt }}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surfaceAlt : colors.surface },
      ]}
    >
      <View style={[styles.rowNumber, { backgroundColor: colors.surfaceAlt }]}>
        <Text style={[styles.rowNumberText, { color: colors.textMuted }]}>{surah.nomor}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
            {surah.namaLatin}
          </Text>
          {offlineReady ? (
            <Ionicons name="arrow-down-circle" size={13} color={colors.primary} />
          ) : null}
        </View>
        <Text style={[styles.rowMeta, { color: colors.textMuted }]} numberOfLines={1}>
          {surah.arti} · {surah.jumlahAyat} ayat · {surah.tempatTurun}
        </Text>
      </View>
      <Text style={[styles.rowArabic, { color: colors.text }]}>{surah.nama}</Text>
    </Pressable>
  );
}

function JumpCard({ reference, onPress }: { reference: Reference; onPress: () => void }) {
  const colors = useColors();
  const { surah, ayah, overAyah } = reference;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        ayah === undefined
          ? `Buka surah ${surah.namaLatin}`
          : `Lompat ke surah ${surah.namaLatin} ayat ${ayah}`
      }
      onPress={onPress}
      style={({ pressed }) => [
        styles.jump,
        { backgroundColor: colors.primarySoft, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.jumpNumber, { backgroundColor: colors.primary }]}>
        <Text style={[styles.jumpNumberText, { color: colors.primaryText }]}>{surah.nomor}</Text>
      </View>

      <View style={styles.jumpBody}>
        <Text style={[styles.jumpTitle, { color: colors.onPrimarySoft }]} numberOfLines={1}>
          {surah.namaLatin}
          {ayah === undefined ? '' : ` : ${ayah}`}
        </Text>
        <Text style={[styles.jumpMeta, { color: colors.onPrimarySoft }]} numberOfLines={1}>
          {overAyah !== undefined
            ? `Surah ini hanya sampai ayat ${surah.jumlahAyat}`
            : ayah !== undefined
              ? 'Lompat ke ayat ini'
              : `${surah.arti} · ${surah.jumlahAyat} ayat`}
        </Text>
      </View>

      <Ionicons name="arrow-forward" size={20} color={colors.onPrimarySoft} />
    </Pressable>
  );
}

type Reference = {
  surah: SurahSummary;
  ayah?: number;
  overAyah?: number;
};

function parseReference(list: SurahSummary[], query: string): Reference | undefined {
  const match = query.trim().match(/^(\d{1,3})(?:\s*[:.]\s*|\s+)?(\d{1,3})?$/);
  if (!match) return undefined;

  const surah = list.find((item) => item.nomor === Number(match[1]));
  if (!surah) return undefined;

  if (match[2] === undefined) return { surah };

  const ayah = Number(match[2]);
  if (ayah < 1 || ayah > surah.jumlahAyat) return { surah, overAyah: ayah };
  return { surah, ayah };
}

function filterSurah(
  list: SurahSummary[],
  query: string,
  exclude?: number,
): SurahSummary[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return list;

  const matches = /^\d+$/.test(trimmed)
    ? list.filter((surah) => String(surah.nomor).startsWith(trimmed))
    : (() => {
        const normalise = (value: string) => value.toLowerCase().replace(/['’\-\s]/g, '');
        const needle = normalise(trimmed);
        return list.filter(
          (surah) =>
            normalise(surah.namaLatin).includes(needle) ||
            normalise(surah.arti).includes(needle) ||
            surah.nama.includes(trimmed),
        );
      })();

  return exclude === undefined ? matches : matches.filter((surah) => surah.nomor !== exclude);
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  listContent: { paddingTop: EXPANDED + spacing.sm, paddingBottom: spacing.xxl },
  notices: { gap: spacing.sm, padding: spacing.md },

  heroText: { alignItems: 'center', gap: 2 },
  heroTitle: { ...typeScale.display, fontFamily: SERIF },
  heroMeta: typeScale.caption,
  barTitle: { ...typeScale.heading, fontSize: 17, flex: 1, textAlign: 'center' },

  searchWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },

  jump: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  jumpNumber: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jumpNumberText: { fontSize: 12.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  jumpBody: { flex: 1, gap: 2 },
  jumpTitle: typeScale.heading,
  jumpMeta: { ...typeScale.caption, fontSize: 12.5, opacity: 0.75 },

  offlineNote: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  offlineText: typeScale.caption,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 66,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowNumber: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowNumberText: { fontSize: 12.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  rowBody: { flex: 1, gap: 2 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: typeScale.heading,
  rowMeta: { ...typeScale.caption, fontSize: 12.5 },
  rowArabic: { fontSize: 20, fontFamily: 'Amiri-Regular', opacity: 0.85 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg + 34 + spacing.md },
});
