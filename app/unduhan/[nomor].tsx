import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getSurah } from '@/api/client';
import { pickAudio, type Ayah } from '@/api/types';
import { useResource } from '@/api/useResource';
import { tapFeedback } from '@/components/feedback';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useToast } from '@/components/toast';
import { Button, ErrorState, Loading, OfflineBanner, ProgressBar, elevation } from '@/components/ui';
import { useOfflineAudio, type DownloadTarget } from '@/offline/audio';
import { useIsOffline } from '@/offline/network';
import { useSettings } from '@/store/settings';
import { TAP_TARGET, radius, spacing, type as typeScale } from '@/theme';

export default function UnduhanSurahScreen() {
  const params = useLocalSearchParams<{ nomor: string }>();
  const surahNumber = Number(params.nomor);

  const { colors, settings } = useSettings();
  const toast = useToast();
  const offline = useIsOffline();

  const { storedCount, isAyahDownloaded, active, download, cancelDownload, removeAyahs } =
    useOfflineAudio();

  const loader = useCallback((force: boolean) => getSurah(surahNumber, force), [surahNumber]);
  const { data, error, loading, reload } = useResource(loader, [surahNumber]);

  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  const stored = storedCount(surahNumber, settings.qari);
  const progress =
    active && active.surah === surahNumber && active.qari === settings.qari ? active : undefined;

  const targets = useMemo(() => {
    const map = new Map<number, string>();
    data?.ayat.forEach((ayah) => {
      const url = pickAudio(ayah.audio, settings.qari);
      if (url) map.set(ayah.nomorAyat, url);
    });
    return map;
  }, [data, settings.qari]);

  const startDownload = useCallback(
    (ayat: number[]) => {
      if (offline) {
        toast.show('Perlu koneksi internet', { tone: 'danger', icon: 'cloud-offline' });
        return;
      }
      if (active) {
        toast.show('Satu unduhan berjalan, tunggu selesai', { icon: 'time-outline' });
        return;
      }
      const queue: DownloadTarget[] = ayat.flatMap((ayah) => {
        const url = targets.get(ayah);
        return url ? [{ ayah, url }] : [];
      });
      if (!queue.length) {
        toast.show('Audio tidak tersedia untuk qari ini', { tone: 'danger', icon: 'alert-circle' });
        return;
      }
      setSelected(new Set());
      download(surahNumber, settings.qari, queue)
        .then((fetched) => {
          if (!fetched) {
            toast.show('Tidak ada ayat terunduh', { tone: 'danger', icon: 'alert-circle' });
          } else if (fetched < queue.length) {
            toast.show(`${fetched} dari ${queue.length} ayat terunduh`, { icon: 'download' });
          } else {
            toast.show(`${fetched} ayat terunduh`, { tone: 'success', icon: 'checkmark-circle' });
          }
        })
        .catch(() => {});
    },
    [offline, active, targets, download, surahNumber, settings.qari, toast],
  );

  const shell = (children: ReactNode) => (
    <View style={styles.fill}>
      <ScreenHeader title={data ? `Unduh ${data.namaLatin}` : 'Unduh Audio'} />
      {children}
    </View>
  );

  if (loading && !data) return shell(<Loading label="Memuat ayat…" />);
  if (error && !data) return shell(<ErrorState message={error} onRetry={reload} />);
  if (!data) return shell(null);

  const toggle = (ayah: number) => {
    tapFeedback();
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(ayah)) next.delete(ayah);
      else next.add(ayah);
      return next;
    });
  };

  const selectedList = [...selected].sort((a, b) => a - b);
  const toDownload = selectedList.filter(
    (ayah) => !isAyahDownloaded(surahNumber, ayah, settings.qari),
  );
  const toRemove = selectedList.filter((ayah) =>
    isAyahDownloaded(surahNumber, ayah, settings.qari),
  );
  const missing = data.ayat
    .map((ayah) => ayah.nomorAyat)
    .filter((ayah) => !isAyahDownloaded(surahNumber, ayah, settings.qari));

  return shell(
    <>
      <FlatList
        data={data.ayat}
        keyExtractor={(item) => String(item.nomorAyat)}
        contentContainerStyle={styles.listContent}
        initialNumToRender={14}
        extraData={selected}
        ListHeaderComponent={
          <View style={styles.header}>
            {offline ? <OfflineBanner /> : null}

            <View style={[styles.status, { backgroundColor: colors.surface }, elevation(colors.shadow, 1)]}>
              <Text style={[styles.statusTitle, { color: colors.text }]}>
                {stored}/{data.jumlahAyat} ayat tersimpan
              </Text>
              <ProgressBar value={stored} total={data.jumlahAyat} />
              {progress ? (
                <View style={styles.progressRow}>
                  <Text style={[styles.statusMeta, { color: colors.primary }]}>
                    Mengunduh {progress.done}/{progress.total}
                  </Text>
                  <Pressable accessibilityRole="button" hitSlop={8} onPress={cancelDownload}>
                    <Text style={[styles.statusAction, { color: colors.danger }]}>Batalkan</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {!progress ? (
              <View style={styles.quickRow}>
                {missing.length ? (
                  <Button
                    label={`Unduh semua (${missing.length})`}
                    icon="download-outline"
                    onPress={() => startDownload(missing)}
                    style={styles.quickButton}
                  />
                ) : null}
                <Button
                  label={selected.size ? 'Kosongkan' : 'Pilih semua'}
                  icon={selected.size ? 'close' : 'checkmark-done'}
                  variant="subtle"
                  onPress={() => {
                    tapFeedback();
                    setSelected(
                      selected.size
                        ? new Set()
                        : new Set(data.ayat.map((ayah) => ayah.nomorAyat)),
                    );
                  }}
                  style={styles.quickButton}
                />
              </View>
            ) : null}

            <Text style={[styles.hint, { color: colors.textFaint }]}>
              Ketuk ayat untuk memilih, lalu unduh atau hapus yang dipilih.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <AyahDownloadRow
            ayah={item}
            selected={selected.has(item.nomorAyat)}
            downloaded={isAyahDownloaded(surahNumber, item.nomorAyat, settings.qari)}
            unavailable={!targets.has(item.nomorAyat)}
            onPress={() => toggle(item.nomorAyat)}
          />
        )}
      />

      {selectedList.length ? (
        <View
          style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}
        >
          <Text style={[styles.barCount, { color: colors.text }]}>
            {selectedList.length} dipilih
          </Text>
          {toRemove.length ? (
            <Button
              label={`Hapus ${toRemove.length}`}
              icon="trash-outline"
              variant="danger"
              onPress={() =>
                Alert.alert(
                  'Hapus audio terpilih?',
                  `${toRemove.length} ayat akan dihapus dari perangkat.`,
                  [
                    { text: 'Batal', style: 'cancel' },
                    {
                      text: 'Hapus',
                      style: 'destructive',
                      onPress: () => {
                        removeAyahs(surahNumber, settings.qari, toRemove)
                          .then(() => {
                            setSelected(new Set());
                            toast.show('Audio dihapus', { tone: 'danger', icon: 'trash' });
                          })
                          .catch(() => {});
                      },
                    },
                  ],
                )
              }
            />
          ) : null}
          {toDownload.length ? (
            <Button
              label={`Unduh ${toDownload.length}`}
              icon="download-outline"
              onPress={() => startDownload(toDownload)}
            />
          ) : null}
        </View>
      ) : null}
    </>,
  );
}

function AyahDownloadRow({
  ayah,
  selected,
  downloaded,
  unavailable,
  onPress,
}: {
  ayah: Ayah;
  selected: boolean;
  downloaded: boolean;
  unavailable: boolean;
  onPress: () => void;
}) {
  const { colors } = useSettings();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: unavailable }}
      accessibilityLabel={`Ayat ${ayah.nomorAyat}${downloaded ? ', tersimpan' : ''}`}
      disabled={unavailable}
      onPress={onPress}
      android_ripple={{ color: colors.surfaceAlt }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected
            ? colors.primarySoft
            : pressed
              ? colors.surfaceAlt
              : colors.surface,
          opacity: unavailable ? 0.45 : 1,
        },
      ]}
    >
      <Ionicons
        name={selected ? 'checkbox' : 'square-outline'}
        size={21}
        color={selected ? colors.primary : colors.textFaint}
      />
      <Text style={[styles.rowNumber, { color: colors.textFaint }]}>{ayah.nomorAyat}</Text>
      <Text numberOfLines={2} style={[styles.rowText, { color: colors.textMuted }]}>
        {unavailable ? 'Audio tidak tersedia untuk qari ini' : ayah.teksIndonesia}
      </Text>
      {downloaded ? (
        <Ionicons name="checkmark-circle" size={19} color={colors.primary} />
      ) : (
        <Ionicons name="cloud-outline" size={19} color={colors.textFaint} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  header: { gap: spacing.md, paddingBottom: spacing.xs },
  status: { borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  statusTitle: { ...typeScale.heading, fontVariant: ['tabular-nums'] },
  statusMeta: { ...typeScale.caption, fontWeight: '600', fontVariant: ['tabular-nums'] },
  statusAction: { ...typeScale.caption, fontWeight: '700' },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickButton: { flex: 1, paddingHorizontal: spacing.md },
  hint: { ...typeScale.caption, paddingHorizontal: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TAP_TARGET,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  rowNumber: {
    ...typeScale.caption,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 26,
  },
  rowText: { ...typeScale.caption, flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  barCount: { ...typeScale.caption, fontWeight: '700', flex: 1 },
});
