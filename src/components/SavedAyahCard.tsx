import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { StyleSheet, Text, View } from 'react-native';

import { IconButton, PressableCard, elevation } from '@/components/ui';
import { tapFeedback, warnFeedback } from '@/components/feedback';
import { useToast } from '@/components/toast';
import { useSettings } from '@/store/settings';
import type { Bookmark } from '@/store/library';
import { ARABIC_FONTS, radius, spacing, type as typeScale } from '@/theme';

export function SavedAyahCard({
  bookmark,
  onOpen,
  onRemove,
  onEditTags,
  onShare,
}: {
  bookmark: Bookmark;
  onOpen: () => void;
  onRemove: () => void;
  onEditTags?: () => void;
  onShare: () => void;
}) {
  const { colors, settings } = useSettings();
  const toast = useToast();
  const font = ARABIC_FONTS[settings.arabicFont];
  const copyText = `${bookmark.arabic}\n\n${bookmark.preview}\n\n(QS. ${bookmark.surahName} : ${bookmark.ayah})`;

  return (
    <PressableCard
      containsControls
      accessibilityLabel={`Buka ${bookmark.surahName} ayat ${bookmark.ayah}`}
      onPress={onOpen}
      style={[styles.card, { backgroundColor: colors.surface }, elevation(colors.shadow, 1)]}
    >
      <View style={styles.top}>
        <View style={[styles.heart, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="heart" size={15} color={colors.onPrimarySoft} />
        </View>
        <View
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Buka ${bookmark.surahName} ayat ${bookmark.ayah}`}
          style={styles.ref}
        >
          <Text numberOfLines={1} style={[styles.refText, { color: colors.text }]}>
            {bookmark.surahName}, {bookmark.surah}:{bookmark.ayah}
          </Text>
          <Text style={[styles.time, { color: colors.textFaint }]}>{formatSavedAt(bookmark.createdAt)}</Text>
        </View>
        {onEditTags ? (
          <IconButton
            name="pricetag-outline"
            label={`Ubah label ayat ${bookmark.ayah}`}
            size={17}
            color={colors.textFaint}
            onPress={onEditTags}
          />
        ) : null}
        <IconButton
          name="share-outline"
          label={`Bagikan ayat ${bookmark.ayah}`}
          size={17}
          color={colors.textFaint}
          onPress={onShare}
        />
        <IconButton
          name="copy-outline"
          label={`Salin ayat ${bookmark.ayah}`}
          size={17}
          color={colors.textFaint}
          haptic={false}
          onPress={() => {
            tapFeedback();
            Clipboard.setStringAsync(copyText)
              .then(() => toast.show('Ayat disalin', { tone: 'success', icon: 'copy' }))
              .catch(() => toast.show('Gagal menyalin ayat', { tone: 'danger', icon: 'alert-circle' }));
          }}
        />
        <IconButton
          name="trash-outline"
          label={`Hapus penanda ayat ${bookmark.ayah}`}
          size={17}
          color={colors.textFaint}
          haptic={false}
          onPress={() => {
            warnFeedback();
            toast.show('Penanda dihapus', { tone: 'danger', icon: 'trash' });
            onRemove();
          }}
        />
      </View>

      {bookmark.arabic ? (
        <Text
          numberOfLines={3}
          style={[
            styles.arabic,
            {
              color: colors.arabic,
              fontFamily: font.key,
              lineHeight: 22 * font.lineHeightRatio,
            },
          ]}
        >
          {bookmark.arabic}
        </Text>
      ) : null}

      <View style={[styles.quote, { borderLeftColor: colors.border }]}>
        <Text style={[styles.quoteText, { color: colors.textMuted }]} numberOfLines={4}>
          “{bookmark.preview}”
        </Text>
      </View>

      {bookmark.tags.length ? (
        <View style={styles.tags}>
          {bookmark.tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.tagText, { color: colors.textMuted }]}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </PressableCard>
  );
}

export function formatSavedAt(timestamp: number): string {
  const date = new Date(timestamp);
  const time = `${String(date.getHours()).padStart(2, '0')}.${String(date.getMinutes()).padStart(2, '0')}`;
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return `Hari ini, ${time}`;
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}, ${time}`;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center' },
  heart: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  ref: { flex: 1, gap: 1 },
  refText: { ...typeScale.caption, fontWeight: '700' },
  time: { ...typeScale.label, fontWeight: '500', letterSpacing: 0.2 },
  arabic: { fontSize: 23, textAlign: 'right', writingDirection: 'rtl' },
  quote: { borderLeftWidth: 2, paddingLeft: spacing.md },
  quoteText: { ...typeScale.caption, lineHeight: 21, fontStyle: 'italic' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.sm },
  tagText: { ...typeScale.label, fontWeight: '700', letterSpacing: 0.3 },
});
