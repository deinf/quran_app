import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { getDoaList } from '@/api/client';
import type { Doa } from '@/api/types';
import { useResource } from '@/api/useResource';
import { MiniPlayer } from '@/components/MiniPlayer';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  EmptyState,
  ErrorState,
  Loading,
  OfflineBanner,
  SearchField,
  SectionTitle,
} from '@/components/ui';
import { tapFeedback } from '@/components/feedback';
import { useIsOffline } from '@/offline/network';
import { useColors } from '@/store/settings';
import { radius, spacing, type as typeScale } from '@/theme';

type Section = { title: string; data: Doa[] };

export default function DoaListScreen() {
  const colors = useColors();
  const router = useRouter();
  const offline = useIsOffline();
  const [query, setQuery] = useState('');

  const { data, error, loading, fromCache, reload } = useResource(getDoaList, []);

  const sections = useMemo<Section[]>(() => {
    if (!data) return [];
    const matched = filterDoa(data, query);
    const order: string[] = [];
    const buckets = new Map<string, Doa[]>();
    for (const doa of matched) {
      if (!buckets.has(doa.grup)) {
        buckets.set(doa.grup, []);
        order.push(doa.grup);
      }
      buckets.get(doa.grup)!.push(doa);
    }
    return order.map((title) => ({ title, data: buckets.get(title)! }));
  }, [data, query]);

  const total = data?.length ?? 0;
  const shown = sections.reduce((sum, section) => sum + section.data.length, 0);

  const shell = (children: ReactNode) => (
    <View style={styles.fill}>
      <ScreenHeader title="Doa Harian" />
      {children}
    </View>
  );

  if (loading && !data) return shell(<Loading label="Memuat doa…" />);
  if (error && !data) return shell(<ErrorState message={error} onRetry={reload} />);

  return shell(
    <>
      <SectionList<Doa, Section>
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        initialNumToRender={12}
        ListHeaderComponent={
          <View style={styles.header}>
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder="Cari doa, arti, atau kelompok"
            />

            {offline ? <OfflineBanner /> : null}

            <Text style={[styles.summary, { color: colors.textMuted }]}>
              {query ? `${shown} dari ${total} doa` : `${total} doa dalam ${sections.length} kelompok`}
              {fromCache && !offline ? ' · salinan offline' : ''}
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <SectionTitle style={styles.sectionTitle}>{section.title}</SectionTitle>
        )}
        renderItem={({ item, index }) => (
          <>
            {index > 0 ? (
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.nama}
              onPress={() => {
                tapFeedback();
                router.push(`/doa/${item.id}`);
              }}
              android_ripple={{ color: colors.surfaceAlt }}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: pressed ? colors.surfaceAlt : colors.surface },
              ]}
            >
              <View style={styles.rowBody}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>{item.nama}</Text>
                <Text numberOfLines={1} style={[styles.rowPreview, { color: colors.textMuted }]}>
                  {item.idn}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />
            </Pressable>
          </>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="Tidak ditemukan"
            message={`Tidak ada doa yang cocok dengan “${query}”.`}
          />
        }
      />
      <MiniPlayer edgeToBottom />
    </>,
  );
}

function filterDoa(list: Doa[], query: string): Doa[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return list;
  return list.filter(
    (doa) =>
      doa.nama.toLowerCase().includes(trimmed) ||
      doa.grup.toLowerCase().includes(trimmed) ||
      doa.idn.toLowerCase().includes(trimmed) ||
      doa.tr.toLowerCase().includes(trimmed),
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  listContent: { paddingBottom: spacing.xxl },
  header: { gap: spacing.md, padding: spacing.md },
  summary: typeScale.caption,
  sectionTitle: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: typeScale.heading,
  rowPreview: { ...typeScale.caption, fontSize: 12.5 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg },
});
