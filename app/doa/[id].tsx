import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { getDoaList } from '@/api/client';
import { useResource } from '@/api/useResource';
import { successFeedback, tapFeedback } from '@/components/feedback';
import { MiniPlayer } from '@/components/MiniPlayer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useToast } from '@/components/toast';
import { Chip, ErrorState, IconButton, Loading, elevation } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { ARABIC_FONTS, radius, spacing, type as typeScale } from '@/theme';

export default function DoaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const doaId = Number(id);

  const { colors, settings } = useSettings();
  const toast = useToast();

  const { data, error, loading, reload } = useResource(getDoaList, []);
  const doa = useMemo(() => data?.find((item) => item.id === doaId), [data, doaId]);

  const shell = (children: ReactNode) => (
    <View style={styles.fill}>
      <ScreenHeader title={doa?.grup ?? 'Doa'} />
      {children}
    </View>
  );

  if (loading && !data) return shell(<Loading label="Memuat doa…" />);
  if (error && !data) return shell(<ErrorState message={error} onRetry={reload} />);
  if (!doa) {
    return shell(<ErrorState message="Doa ini tidak ditemukan." onRetry={reload} />);
  }

  const font = ARABIC_FONTS[settings.arabicFont];
  const plainText = `${doa.nama}\n\n${doa.ar}\n\n${doa.tr}\n\n${doa.idn}`;

  return shell(
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.text }]}>{doa.nama}</Text>
          <View style={styles.chips}>
            <Chip label={doa.grup} tone="accent" />
            {doa.tag ? <Chip label={doa.tag} /> : null}
          </View>
        </View>

        <View
          style={[styles.card, { backgroundColor: colors.surface }, elevation(colors.shadow, 1)]}
        >
          <View style={[styles.actions, { borderBottomColor: colors.border }]}>
            <IconButton
              name="copy-outline"
              label="Salin doa"
              size={20}
              haptic={false}
              onPress={() => {
                tapFeedback();
                Clipboard.setStringAsync(plainText)
                  .then(() => toast.show('Doa disalin', { tone: 'success', icon: 'copy' }))
                  .catch(() => toast.show('Gagal menyalin doa', { tone: 'danger', icon: 'alert-circle' }));
              }}
            />
            <IconButton
              name="share-outline"
              label="Bagikan doa"
              size={20}
              onPress={() => {
                Share.share({ message: plainText }).catch(() => {});
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
            {doa.ar}
          </Text>

          <Text style={[styles.latin, { color: colors.textMuted }]}>{doa.tr}</Text>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          <Text style={[styles.translation, { color: colors.text }]}>{doa.idn}</Text>
        </View>

        {doa.tentang ? (
          <View
            style={[styles.card, { backgroundColor: colors.surfaceAlt }]}
          >
            <View style={styles.aboutHead}>
              <Ionicons name="information-circle-outline" size={17} color={colors.textMuted} />
              <Text style={[styles.aboutTitle, { color: colors.textMuted }]}>Keterangan</Text>
            </View>
            <Text style={[styles.about, { color: colors.text }]}>{doa.tentang.trim()}</Text>
          </View>
        ) : null}
      </ScrollView>
      <MiniPlayer edgeToBottom />
    </>,
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  titleBlock: { gap: spacing.sm, paddingHorizontal: spacing.xs, paddingTop: spacing.xs },
  title: { ...typeScale.title, fontSize: 22, lineHeight: 29 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  arabic: { textAlign: 'right', writingDirection: 'rtl' },
  latin: { ...typeScale.caption, fontStyle: 'italic', lineHeight: 23 },
  divider: { height: StyleSheet.hairlineWidth },
  translation: { ...typeScale.body, lineHeight: 26 },
  aboutHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aboutTitle: { ...typeScale.label, letterSpacing: 0.6, textTransform: 'uppercase' },
  about: { ...typeScale.caption, lineHeight: 21 },
});
