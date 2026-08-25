import * as Clipboard from 'expo-clipboard';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Ayah } from '@/api/types';
import { usePlaybackFlags } from '@/audio/player';
import { IconButton, elevation } from '@/components/ui';
import { pressFeedback, successFeedback, tapFeedback } from '@/components/feedback';
import { useToast } from '@/components/toast';
import { useSettings } from '@/store/settings';
import { ARABIC_FONTS, radius, spacing, type as typeScale } from '@/theme';

type Props = {
  ayah: Ayah;
  surahName: string;
  bookmarked: boolean;
  active: boolean;
  onPlay: (ayahNumber: number) => void;
  onToggleBookmark: (ayah: Ayah) => void;
  onOpenTafsir: (ayahNumber: number) => void;
  onShare: (ayahNumber: number) => void;
};

export const AyahCard = memo(function AyahCard({
  ayah,
  surahName,
  bookmarked,
  active,
  onPlay,
  onToggleBookmark,
  onOpenTafsir,
  onShare,
}: Props) {
  const { colors, settings } = useSettings();
  const toast = useToast();
  const { playing } = usePlaybackFlags();
  const isPlaying = active && playing;

  const font = ARABIC_FONTS[settings.arabicFont];
  const reference = `${surahName} : ${ayah.nomorAyat}`;
  const copyText = `${ayah.teksArab}\n\n${ayah.teksIndonesia}\n\n(QS. ${reference})`;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: active ? colors.highlight : colors.surface },
        active ? elevation(colors.shadow, 2) : null,
      ]}
    >
      <View style={styles.toolbar}>
        <Text
          style={[styles.numberText, { color: active ? colors.primary : colors.textFaint }]}
        >
          {ayah.nomorAyat}
        </Text>
        <View style={styles.spacer} />
        <IconButton
          name="book-outline"
          label={`Tafsir ayat ${ayah.nomorAyat}`}
          size={17}
          onPress={() => onOpenTafsir(ayah.nomorAyat)}
        />
        <IconButton
          name="share-outline"
          label={`Bagikan ayat ${ayah.nomorAyat}`}
          size={17}
          onPress={() => onShare(ayah.nomorAyat)}
        />
        <IconButton
          name="copy-outline"
          label={`Salin ayat ${ayah.nomorAyat}`}
          size={17}
          haptic={false}
          onPress={() => {
            tapFeedback();
            Clipboard.setStringAsync(copyText)
              .then(() => toast.show('Ayat disalin', { tone: 'success', icon: 'copy' }))
              .catch(() => toast.show('Gagal menyalin ayat', { tone: 'danger', icon: 'alert-circle' }));
          }}
        />
        <IconButton
          name={bookmarked ? 'bookmark' : 'bookmark-outline'}
          label={bookmarked ? `Hapus penanda ayat ${ayah.nomorAyat}` : `Tandai ayat ${ayah.nomorAyat}`}
          size={17}
          color={bookmarked ? colors.primary : undefined}
          haptic={false}
          onPress={() => {
            if (bookmarked) {
              tapFeedback();
              toast.show('Penanda dihapus', { tone: 'neutral', icon: 'bookmark-outline' });
            } else {
              successFeedback();
              toast.show('Ayat disimpan ke Tersimpan', { tone: 'success', icon: 'bookmark' });
            }
            onToggleBookmark(ayah);
          }}
        />
        <IconButton
          name={isPlaying ? 'pause-circle' : 'play-circle'}
          label={isPlaying ? 'Jeda ayat' : `Putar ayat ${ayah.nomorAyat}`}
          size={26}
          color={colors.primary}
          haptic={false}
          onPress={() => {
            pressFeedback();
            onPlay(ayah.nomorAyat);
          }}
        />
      </View>

      <Text
        style={[
          styles.arabic,
          {
            color: colors.arabic,
            fontFamily: font.key,
            fontSize: settings.arabicFontSize,
            lineHeight: settings.arabicFontSize * font.lineHeightRatio,
          },
        ]}
      >
        {ayah.teksArab}
      </Text>

      {settings.showLatin ? (
        <Text style={[styles.latin, { color: colors.textMuted }]}>{ayah.teksLatin.trim()}</Text>
      ) : null}

      {settings.showTranslation ? (
        <>
          <View style={[styles.rule, { backgroundColor: colors.divider }]} />
          <Text style={[styles.translation, { color: colors.text }]}>{ayah.teksIndonesia}</Text>
        </>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  numberText: {
    ...typeScale.label,
    minWidth: 22,
    fontVariant: ['tabular-nums'],
  },
  spacer: { flex: 1 },
  rule: { height: StyleSheet.hairlineWidth, marginTop: -spacing.xs },
  arabic: { textAlign: 'right', writingDirection: 'rtl' },
  latin: { ...typeScale.caption, fontStyle: 'italic', lineHeight: 22, opacity: 0.95 },
  translation: typeScale.body,
});
