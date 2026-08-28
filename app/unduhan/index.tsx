import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { clearCache, getCacheStats, getSurah, getSurahList, prefetchAllSurah } from '@/api/client';
import { QARI, pickAudio, type SurahSummary } from '@/api/types';
import { useResource } from '@/api/useResource';
import { tapFeedback } from '@/components/feedback';
import { MiniPlayer } from '@/components/MiniPlayer';
import { QariSheet } from '@/components/QariSheet';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useToast } from '@/components/toast';
import {
  Button,
  EmptyState,
  ErrorState,
  Loading,
  MarqueeText,
  OfflineBanner,
  ProgressBar,
  SearchField,
  elevation,
} from '@/components/ui';
import { formatBytes, useOfflineAudio, type DownloadTarget } from '@/offline/audio';
import { useIsOffline } from '@/offline/network';
import { useSettings } from '@/store/settings';
import { HAIRLINE, TAP_TARGET, radius, spacing, type as typeScale } from '@/theme';

const TOTAL_SURAH = 114;

type Tab = 'audio' | 'teks';

export default function UnduhanScreen() {
  const [tab, setTab] = useState<Tab>('audio');
  const { colors } = useSettings();

  return (
    <View style={styles.fill}>
      <ScreenHeader title="Unduhan Offline" />
      <View style={[styles.tabBar, { backgroundColor: colors.surfaceAlt }]}>
        <TabButton label="Audio" active={tab === 'audio'} onPress={() => setTab('audio')} />
        <TabButton label="Teks Surah" active={tab === 'teks'} onPress={() => setTab('teks')} />
      </View>

      {tab === 'audio' ? <AudioTab /> : <TeksTab />}

      <MiniPlayer edgeToBottom />
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useSettings();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={[styles.tab, active ? { backgroundColor: colors.primary } : null]}
    >
      <Text style={[styles.tabLabel, { color: active ? colors.primaryText : colors.textMuted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function AudioTab() {
  const router = useRouter();
  const { colors, settings, setSetting } = useSettings();
  const toast = useToast();
  const offline = useIsOffline();
  const [query, setQuery] = useState('');

  const {
    storedCount,
    active,
    download,
    cancelDownload,
    removeSurah,
    removeAll,
    usedBytes,
    totalStored,
    storedByQari,
    refreshUsage,
  } = useOfflineAudio();

  const { data, error, loading, reload } = useResource(getSurahList, []);
  useEffect(refreshUsage, [refreshUsage]);

  const [preparing, setPreparing] = useState<number | undefined>();
  const [qariSheet, setQariSheet] = useState(false);

  const qariName = useMemo(
    () => QARI.find((q) => q.id === settings.qari)?.name ?? 'Qari',
    [settings.qari],
  );

  const results = useMemo(() => filterSurah(data ?? [], query), [data, query]);

  const qariStored = storedByQari[settings.qari]?.ayat ?? 0;

  const startDownload = async (surah: SurahSummary) => {
    if (offline) {
      toast.show('Perlu koneksi internet', { tone: 'danger', icon: 'cloud-offline' });
      return;
    }
    if (active || preparing) {
      toast.show('Satu unduhan berjalan, tunggu selesai', { icon: 'time-outline' });
      return;
    }
    tapFeedback();
    setPreparing(surah.nomor);
    try {
      const { data: detail } = await getSurah(surah.nomor);
      const queue: DownloadTarget[] = detail.ayat.flatMap((ayah) => {
        const url = pickAudio(ayah.audio, settings.qari);
        return url ? [{ ayah: ayah.nomorAyat, url }] : [];
      });
      if (!queue.length) {
        toast.show('Audio tidak tersedia untuk qari ini', { tone: 'danger', icon: 'alert-circle' });
        return;
      }
      const fetched = await download(surah.nomor, settings.qari, queue);
      if (!fetched) {
        toast.show('Tidak ada ayat terunduh', { tone: 'danger', icon: 'alert-circle' });
      } else if (fetched < queue.length) {
        toast.show(`${fetched} dari ${queue.length} ayat terunduh`, { icon: 'download' });
      } else {
        toast.show(`${surah.namaLatin} terunduh`, { tone: 'success', icon: 'checkmark-circle' });
      }
    } catch {
      toast.show('Gagal memulai unduhan', { tone: 'danger', icon: 'alert-circle' });
    } finally {
      setPreparing(undefined);
    }
  };

  if (loading && !data) return <Loading label="Memuat daftar surah…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <FlatList
      data={results}
      keyExtractor={(item) => String(item.nomor)}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.listContent}
      initialNumToRender={12}
      ListHeaderComponent={
        <View style={styles.header}>
          {offline ? <OfflineBanner /> : null}

          <View
            style={[styles.summary, { backgroundColor: colors.surface }, elevation(colors.shadow, 1)]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Qari ${qariName}. Ketuk untuk mengubah`}
              onPress={() => setQariSheet(true)}
              style={({ pressed }) => [
                styles.qariRow,
                { borderBottomColor: colors.divider, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Ionicons name="person-circle-outline" size={19} color={colors.textMuted} />
              <Text style={[styles.qariLabel, { color: colors.textMuted }]}>Qari</Text>
              <MarqueeText style={[styles.qariName, { color: colors.text }]}>
                {qariName}
              </MarqueeText>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>

            <View style={styles.summaryStats}>
              <View style={styles.summaryBody}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>
                  {qariStored} ayat tersimpan
                </Text>
                <Text style={[styles.summaryMeta, { color: colors.textMuted }]}>
                  {totalStored > qariStored
                    ? `${formatBytes(usedBytes)} untuk semua qari`
                    : formatBytes(usedBytes)}
                </Text>
              </View>
              {totalStored > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Hapus semua audio offline"
                  hitSlop={8}
                  onPress={() =>
                    Alert.alert(
                      'Hapus semua audio offline?',
                      `${formatBytes(usedBytes)} akan dikosongkan.`,
                      [
                        { text: 'Batal', style: 'cancel' },
                        {
                          text: 'Hapus',
                          style: 'destructive',
                          onPress: () => {
                            removeAll()
                              .then(() =>
                                toast.show('Audio offline dihapus', {
                                  tone: 'danger',
                                  icon: 'trash',
                                }),
                              )
                              .catch(() => {});
                          },
                        },
                      ],
                    )
                  }
                >
                  <Ionicons name="trash-outline" size={19} color={colors.danger} />
                </Pressable>
              ) : (
                <Ionicons name="musical-notes" size={20} color={colors.primary} />
              )}
            </View>
          </View>

          <SearchField value={query} onChangeText={setQuery} placeholder="Cari surah" />

          <Text style={[styles.hint, { color: colors.textFaint }]}>
            Ketuk surah untuk memilih ayat satu per satu, atau ketuk ikon unduh untuk seluruh surah.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <SurahDownloadRow
          surah={item}
          stored={storedCount(item.nomor, settings.qari)}
          progress={
            active && active.surah === item.nomor && active.qari === settings.qari
              ? active
              : undefined
          }
          preparing={preparing === item.nomor}
          onOpen={() => {
            tapFeedback();
            router.push(`/unduhan/${item.nomor}`);
          }}
          onDownload={() => {
            void startDownload(item);
          }}
          onCancel={cancelDownload}
          onRemove={() =>
            Alert.alert('Hapus audio offline?', `Rekaman ${item.namaLatin} akan dihapus.`, [
              { text: 'Batal', style: 'cancel' },
              {
                text: 'Hapus',
                style: 'destructive',
                onPress: () => {
                  removeSurah(item.nomor, settings.qari)
                    .then(() => toast.show('Audio dihapus', { tone: 'danger', icon: 'trash' }))
                    .catch(() => {});
                },
              },
            ])
          }
        />
      )}
      ListEmptyComponent={
        <EmptyState
          icon="search-outline"
          title="Tidak ditemukan"
          message={`Tidak ada surah yang cocok dengan “${query}”.`}
        />
      }
      />

      <QariSheet
        visible={qariSheet}
        onClose={() => setQariSheet(false)}
        onSelect={(qari) => {
          setQariSheet(false);
          setSetting('qari', qari);
        }}
      />
    </>
  );
}

function TeksTab() {
  const { colors } = useSettings();
  const toast = useToast();
  const offline = useIsOffline();

  const [cacheStats, setCacheStats] = useState<{ surah: number; tafsir: number }>();
  const [prefetch, setPrefetch] = useState<{ done: number; total: number }>();
  const prefetchAbort = useRef({ aborted: false });

  const refreshStats = useCallback(() => {
    getCacheStats()
      .then(setCacheStats)
      .catch(() => {});
  }, []);
  useEffect(refreshStats, [refreshStats]);

  const stored = cacheStats?.surah ?? 0;
  const complete = stored >= TOTAL_SURAH;

  return (
    <ScrollView contentContainerStyle={styles.teksContent}>
      {offline ? <OfflineBanner /> : null}

      <View
        style={[styles.summary, { backgroundColor: colors.surface }, elevation(colors.shadow, 1)]}
      >
        <View style={styles.summaryBody}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            {stored}/{TOTAL_SURAH} surah tersimpan
          </Text>
          <Text style={[styles.summaryMeta, { color: colors.textMuted }]}>
            {cacheStats ? `${cacheStats.tafsir} tafsir tersimpan` : 'Menghitung…'}
          </Text>
        </View>
        <Ionicons
          name={complete ? 'checkmark-circle' : 'document-text-outline'}
          size={20}
          color={complete ? colors.primary : colors.textFaint}
        />
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }, elevation(colors.shadow, 1)]}>
        <ProgressBar value={prefetch ? prefetch.done : stored} total={TOTAL_SURAH} />

        {prefetch ? (
          <View style={styles.progressRow}>
            <Text style={[styles.summaryMeta, { color: colors.primary }]}>
              Mengunduh teks… {prefetch.done}/{prefetch.total}
            </Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                prefetchAbort.current.aborted = true;
              }}
            >
              <Text style={[styles.cardAction, { color: colors.danger }]}>Batalkan</Text>
            </Pressable>
          </View>
        ) : complete ? (
          <Text style={[styles.summaryMeta, { color: colors.textMuted }]}>
            Semua surah siap dibaca tanpa internet.
          </Text>
        ) : (
          <Button
            label={stored > 0 ? 'Lanjutkan unduhan teks' : 'Unduh seluruh teks'}
            icon="cloud-download-outline"
            onPress={() => {
              if (offline) {
                toast.show('Perlu koneksi internet', { tone: 'danger', icon: 'cloud-offline' });
                return;
              }
              prefetchAbort.current = { aborted: false };
              setPrefetch({ done: 0, total: TOTAL_SURAH });
              prefetchAllSurah((done, total) => setPrefetch({ done, total }), prefetchAbort.current)
                .catch(() => {})
                .finally(() => {
                  setPrefetch(undefined);
                  refreshStats();
                });
            }}
          />
        )}
      </View>

      {stored > 0 && !prefetch ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            Alert.alert('Hapus teks offline?', 'Surah akan diunduh ulang saat dibuka.', [
              { text: 'Batal', style: 'cancel' },
              {
                text: 'Hapus',
                style: 'destructive',
                onPress: () => {
                  clearCache()
                    .then(() => {
                      refreshStats();
                      toast.show('Teks offline dihapus', { tone: 'danger', icon: 'trash' });
                    })
                    .catch(() => {});
                },
              },
            ])
          }
          style={({ pressed }) => [styles.clearRow, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="trash-outline" size={17} color={colors.danger} />
          <Text style={[styles.cardAction, { color: colors.danger }]}>Hapus teks offline</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function SurahDownloadRow({
  surah,
  stored,
  progress,
  preparing,
  onOpen,
  onDownload,
  onCancel,
  onRemove,
}: {
  surah: SurahSummary;
  stored: number;
  progress: { done: number; total: number } | undefined;
  preparing: boolean;
  onOpen: () => void;
  onDownload: () => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const { colors } = useSettings();
  const complete = stored >= surah.jumlahAyat;
  const partial = stored > 0 && !complete;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${surah.namaLatin}, ${stored} dari ${surah.jumlahAyat} ayat tersimpan`}
      onPress={onOpen}
      android_ripple={{ color: colors.surfaceAlt }}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surfaceAlt : colors.surface },
      ]}
    >
      <Text style={[styles.rowNumber, { color: colors.textFaint }]}>{surah.nomor}</Text>

      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
          {surah.namaLatin}
        </Text>
        {progress ? (
          <>
            <Text style={[styles.rowMeta, { color: colors.primary }]}>
              Mengunduh {progress.done}/{progress.total}
            </Text>
            <ProgressBar value={progress.done} total={progress.total} />
          </>
        ) : (
          <Text style={[styles.rowMeta, { color: complete ? colors.primary : colors.textMuted }]}>
            {preparing
              ? 'Menyiapkan…'
              : complete
                ? `Lengkap · ${surah.jumlahAyat} ayat`
                : `${stored}/${surah.jumlahAyat} ayat tersimpan`}
          </Text>
        )}
        {partial && !progress ? <ProgressBar value={stored} total={surah.jumlahAyat} /> : null}
      </View>

      {preparing && !progress ? (
        <ActivityIndicator color={colors.primary} style={styles.action} />
      ) : progress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Batalkan unduhan"
          hitSlop={10}
          onPress={onCancel}
          style={styles.action}
        >
          <Ionicons name="close-circle" size={24} color={colors.danger} />
        </Pressable>
      ) : complete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Hapus audio ${surah.namaLatin}`}
          hitSlop={10}
          onPress={onRemove}
          style={styles.action}
        >
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Unduh seluruh surah ${surah.namaLatin}`}
          hitSlop={10}
          onPress={onDownload}
          style={styles.action}
        >
          <Ionicons name="download-outline" size={22} color={colors.primary} />
        </Pressable>
      )}
    </Pressable>
  );
}

function filterSurah(list: SurahSummary[], query: string): SurahSummary[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return list;
  const normalise = (value: string) => value.toLowerCase().replace(/['’\-\s]/g, '');
  const needle = normalise(trimmed);
  return list.filter(
    (surah) =>
      normalise(surah.namaLatin).includes(needle) ||
      normalise(surah.arti).includes(needle) ||
      String(surah.nomor) === trimmed,
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },

  tabBar: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    margin: spacing.md,
    borderRadius: radius.pill,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill },
  tabLabel: { ...typeScale.caption, fontWeight: '700' },

  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  teksContent: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { gap: spacing.md, paddingBottom: spacing.xs },

  summary: { padding: spacing.lg, borderRadius: radius.xl },
  summaryStats: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summaryBody: { flex: 1, gap: 2 },
  qariRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: HAIRLINE,
  },
  qariLabel: typeScale.caption,
  qariName: typeScale.heading,
  summaryTitle: typeScale.heading,
  summaryMeta: { ...typeScale.caption, fontVariant: ['tabular-nums'] },

  card: { borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  cardAction: { ...typeScale.caption, fontWeight: '700' },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },

  hint: { ...typeScale.caption, paddingHorizontal: spacing.xs },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TAP_TARGET,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
  },
  rowNumber: {
    ...typeScale.caption,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 24,
  },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: { ...typeScale.body, fontWeight: '600' },
  rowMeta: { ...typeScale.caption, fontVariant: ['tabular-nums'] },
  action: { padding: 2 },
});
