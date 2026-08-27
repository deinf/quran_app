import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { FlatList, StyleSheet, Text, View, type ViewToken } from 'react-native';

import { getTafsir } from '@/api/client';
import type { TafsirEntry } from '@/api/types';
import { useResource } from '@/api/useResource';
import { MiniPlayer } from '@/components/MiniPlayer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AyahBadge, ErrorState, Loading, elevation, stripHtml } from '@/components/ui';
import { useColors } from '@/store/settings';
import { radius, spacing, type as typeScale } from '@/theme';

export default function TafsirScreen() {
  const params = useLocalSearchParams<{ nomor: string; ayah?: string }>();
  const surahNumber = Number(params.nomor);
  const targetAyah = params.ayah ? Number(params.ayah) : undefined;

  const colors = useColors();
  const listRef = useRef<FlatList<TafsirEntry>>(null);

  const loader = useCallback((force: boolean) => getTafsir(surahNumber, force), [surahNumber]);
  const { data, error, loading, reload } = useResource(loader, [surahNumber]);

  const jumped = useRef(false);
  const pendingJump = useRef<{ index: number; attempts: number } | undefined>(undefined);
  useEffect(() => {
    if (!data || !targetAyah || jumped.current) return;
    const index = data.tafsir.findIndex((entry) => entry.ayat === targetAyah);
    if (index < 0) return;
    jumped.current = true;
    const timer = setTimeout(() => {
      pendingJump.current = { index, attempts: 0 };
      listRef.current?.scrollToIndex({ index, viewPosition: JUMP_VIEW_POSITION, animated: false });
    }, 250);
    return () => clearTimeout(timer);
  }, [data, targetAyah]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const pending = pendingJump.current;
    if (!pending) return;
    if (viewableItems.some((token) => token.index === pending.index)) {
      pendingJump.current = undefined;
      return;
    }
    if (pending.attempts >= MAX_JUMP_ATTEMPTS) {
      pendingJump.current = undefined;
      return;
    }
    pending.attempts += 1;
    listRef.current?.scrollToIndex({
      index: pending.index,
      viewPosition: JUMP_VIEW_POSITION,
      animated: false,
    });
  }).current;

  const subtitle = useMemo(
    () => (data ? `${data.arti} · ${data.jumlahAyat} ayat · ${data.tempatTurun}` : ''),
    [data],
  );

  const shell = (children: ReactNode) => (
    <View style={styles.fill}>
      <ScreenHeader title={data ? `Tafsir ${data.namaLatin}` : 'Tafsir'} />
      {children}
    </View>
  );

  if (loading && !data) return shell(<Loading label="Memuat tafsir…" />);
  if (error && !data) return shell(<ErrorState message={error} onRetry={reload} />);
  if (!data) return shell(null);

  return shell(
    <>
      <FlatList
        ref={listRef}
        data={data.tafsir}
        keyExtractor={(item) => String(item.ayat)}
        contentContainerStyle={styles.listContent}
        initialNumToRender={4}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onScrollToIndexFailed={({ index, averageItemLength }) => {
          const pending = pendingJump.current;
          if (pending && pending.attempts >= MAX_JUMP_ATTEMPTS) return;
          if (pending) pending.attempts += 1;
          if (averageItemLength > 0) {
            listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: false });
          }
          setTimeout(
            () =>
              listRef.current?.scrollToIndex({
                index,
                viewPosition: JUMP_VIEW_POSITION,
                animated: false,
              }),
            120,
          );
        }}
        ListHeaderComponent={
          <View style={[styles.header, { backgroundColor: colors.surface }, elevation(colors.shadow, 1)]}>
            <Text style={[styles.headerArabic, { color: colors.primary }]}>{data.nama}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{data.namaLatin}</Text>
            <Text style={[styles.headerMeta, { color: colors.textMuted }]}>{subtitle}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.entry, { backgroundColor: colors.surface }, elevation(colors.shadow, 1)]}>
            <View style={styles.entryHead}>
              <AyahBadge value={item.ayat} />
              <Text style={[styles.entryLabel, { color: colors.textFaint }]}>Ayat {item.ayat}</Text>
            </View>
            <Text style={[styles.entryText, { color: colors.text }]}>{stripHtml(item.teks)}</Text>
          </View>
        )}
      />
      <MiniPlayer edgeToBottom />
    </>,
  );
}

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 20, minimumViewTime: 120 };

const JUMP_VIEW_POSITION = 0.03;

const MAX_JUMP_ATTEMPTS = 14;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { alignItems: 'center', gap: 4, padding: spacing.xl, borderRadius: radius.xxl },
  headerArabic: { fontSize: 34, fontFamily: 'Amiri-Regular' },
  headerTitle: typeScale.title,
  headerMeta: { ...typeScale.caption, textAlign: 'center' },
  entry: { borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  entryHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  entryLabel: { ...typeScale.label, textTransform: 'uppercase' },
  entryText: { ...typeScale.body, lineHeight: 26 },
});
