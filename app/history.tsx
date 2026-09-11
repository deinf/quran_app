import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { MiniPlayer } from '@/components/MiniPlayer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AyahBadge, EmptyState, Loading, PressableCard, ProgressBar, elevation } from '@/components/ui';
import { useLibrary, type HistoryEntry } from '@/store/library';
import { useColors } from '@/store/settings';
import { radius, spacing, type as typeScale } from '@/theme';

export default function HistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const { history, ready, clearHistory } = useLibrary();

  const shell = (children: ReactNode) => (
    <View style={styles.fill}>
      <ScreenHeader title="Riwayat Bacaan" />
      {children}
    </View>
  );

  if (!ready) return shell(<Loading label="Memuat riwayat bacaan…" />);

  if (!history.length) {
    return shell(
      <EmptyState
        icon="time-outline"
        title="Belum ada riwayat"
        message="Surah yang kamu buka akan tercatat di sini."
      />,
    );
  }

  return shell(
    <>
      <FlatList
        data={history}
        keyExtractor={(item) => String(item.surah)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              Alert.alert('Hapus riwayat bacaan?', 'Tindakan ini tidak dapat dibatalkan.', [
                { text: 'Batal', style: 'cancel' },
                { text: 'Hapus', style: 'destructive', onPress: clearHistory },
              ])
            }
            style={styles.clearRow}
            hitSlop={8}
          >
            <Text style={[styles.clearLabel, { color: colors.danger }]}>Hapus riwayat</Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <HistoryRow
            entry={item}
            onPress={() => router.push(`/surah/${item.surah}?ayah=${item.ayah}`)}
          />
        )}
      />
      <MiniPlayer edgeToBottom />
    </>,
  );
}

function HistoryRow({ entry, onPress }: { entry: HistoryEntry; onPress: () => void }) {
  const colors = useColors();
  return (
    <PressableCard
      accessibilityLabel={`${entry.surahName} ayat ${entry.ayah}`}
      onPress={onPress}
      style={[styles.row, { backgroundColor: colors.surface }, elevation(colors.shadow, 1)]}
    >
      <AyahBadge value={entry.surah} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]}>{entry.surahName}</Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          Ayat {entry.ayah} dari {entry.totalAyah} · {formatVisited(entry.visitedAt)}
        </Text>
        <ProgressBar value={entry.ayah} total={entry.totalAyah} />
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </PressableCard>
  );
}

function formatVisited(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  const date = new Date(timestamp);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  clearRow: { alignSelf: 'flex-end', paddingVertical: spacing.xs, paddingHorizontal: spacing.xs },
  clearLabel: { ...typeScale.caption, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
  },
  body: { flex: 1, gap: 6 },
  title: typeScale.heading,
  meta: { ...typeScale.caption, fontSize: 12.5 },
});
