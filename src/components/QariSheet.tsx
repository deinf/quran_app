import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QARI, type QariId } from '@/api/types';
import { tapFeedback } from '@/components/feedback';
import { useOfflineAudio } from '@/offline/audio';
import { useSettings } from '@/store/settings';
import { HAIRLINE, TAP_TARGET, radius, spacing, type as typeScale } from '@/theme';

function initials(name: string): string {
  const words = name.split(/[\s-]+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function QariSheet({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (qari: QariId) => void;
}) {
  const { colors, settings } = useSettings();
  const { storedByQari } = useOfflineAudio();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.scrim]}
          onPress={onClose}
          accessibilityLabel="Tutup"
        />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.head}>
            <View style={styles.headText}>
              <Text style={[styles.title, { color: colors.text }]}>Pilih Qari</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Dipakai untuk semua audio dan unduhan
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup"
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [
                styles.close,
                { backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Ionicons name="close" size={19} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            <View style={[styles.group, { borderColor: colors.border }]}>
              {QARI.map((qari, index) => {
                const stored = storedByQari[qari.id];
                const current = settings.qari === qari.id;
                return (
                  <Pressable
                    key={qari.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: current }}
                    accessibilityLabel={
                      stored
                        ? `${qari.name}, ${stored.surah} surah dan ${stored.ayat} ayat tersimpan`
                        : `${qari.name}, belum ada unduhan`
                    }
                    onPress={() => {
                      tapFeedback();
                      onSelect(qari.id);
                    }}
                    style={({ pressed }) => [
                      styles.row,
                      index > 0 ? { borderTopWidth: HAIRLINE, borderTopColor: colors.divider } : null,
                      current ? { backgroundColor: colors.primarySoft } : null,
                      pressed && !current ? { backgroundColor: colors.surfaceAlt } : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: current ? colors.primary : colors.surfaceAlt,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarText,
                          { color: current ? colors.primaryText : colors.textMuted },
                        ]}
                      >
                        {initials(qari.name)}
                      </Text>
                    </View>

                    <View style={styles.rowBody}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.rowTitle,
                          { color: current ? colors.onPrimarySoft : colors.text },
                        ]}
                      >
                        {qari.name}
                      </Text>
                      <View style={styles.rowMetaLine}>
                        {stored ? (
                          <Ionicons name="cloud-done" size={13} color={colors.primary} />
                        ) : null}
                        <Text
                          style={[
                            styles.rowMeta,
                            { color: stored ? colors.primary : colors.textFaint },
                          ]}
                        >
                          {stored
                            ? `${stored.surah} surah · ${stored.ayat} ayat tersimpan`
                            : 'Belum ada unduhan'}
                        </Text>
                      </View>
                    </View>

                    {current ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    ) : (
                      <View style={[styles.radio, { borderColor: colors.border }]} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: spacing.sm,
    maxHeight: '82%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headText: { flex: 1, gap: 2 },
  title: typeScale.title,
  subtitle: typeScale.caption,
  close: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flexGrow: 0 },
  listContent: { paddingHorizontal: spacing.lg },
  group: { borderRadius: radius.xl, borderWidth: HAIRLINE, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TAP_TARGET + 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: typeScale.heading,
  rowMetaLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowMeta: { ...typeScale.caption, fontSize: 12 },
  radio: { width: 22, height: 22, borderRadius: radius.pill, borderWidth: 1.5 },
});
