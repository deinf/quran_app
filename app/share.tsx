import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { getSurah } from '@/api/client';
import { useResource } from '@/api/useResource';
import { tapFeedback } from '@/components/feedback';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button, ErrorState, Loading, SectionTitle } from '@/components/ui';
import {
  DEFAULT_SHARE_THEME,
  SHARE_FONT_SIZE,
  SHARE_THEMES,
  type ShareAlignment,
  type ShareTheme,
} from '@/share/themes';
import { useSettings } from '@/store/settings';
import { ARABIC_FONTS, radius, spacing } from '@/theme';

const ALIGNMENTS: { value: ShareAlignment; label: string }[] = [
  { value: 'left', label: 'Kiri' },
  { value: 'center', label: 'Tengah' },
  { value: 'right', label: 'Kanan' },
];

export default function ShareVerseScreen() {
  const params = useLocalSearchParams<{ surah: string; ayah: string }>();
  const surahNumber = Number(params.surah);
  const ayahNumber = Number(params.ayah);

  const { colors, settings } = useSettings();

  const [theme, setTheme] = useState<ShareTheme>(DEFAULT_SHARE_THEME);
  const [fontSize, setFontSize] = useState<number>(SHARE_FONT_SIZE.default);
  const [sizeDraft, setSizeDraft] = useState<number | undefined>();
  const [alignment, setAlignment] = useState<ShareAlignment>('center');
  const [showTranslation, setShowTranslation] = useState(true);
  const [showLatin, setShowLatin] = useState(false);
  const [busy, setBusy] = useState(false);

  const cardRef = useRef<View>(null);

  const loader = useCallback((force: boolean) => getSurah(surahNumber, force), [surahNumber]);
  const { data, error, loading, reload } = useResource(loader, [surahNumber]);

  const ayah = useMemo(
    () => data?.ayat.find((item) => item.nomorAyat === ayahNumber),
    [data, ayahNumber],
  );

  const reference = data ? `Surah ${data.namaLatin} • ${data.nomor}:${ayahNumber}` : '';

  const shareCard = useCallback(async () => {
    if (!ayah || !data) return;
    const fallbackText = `${ayah.teksArab}\n\n${ayah.teksIndonesia}\n\n(QS. ${data.namaLatin} : ${ayahNumber})`;
    setBusy(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: reference,
          UTI: 'public.png',
        });
      } else {
        await Share.share({ message: fallbackText });
      }
    } catch {
      try {
        await Share.share({ message: fallbackText });
      } catch {}
    } finally {
      setBusy(false);
    }
  }, [ayah, data, ayahNumber, reference]);

  const shell = (children: ReactNode) => (
    <View style={styles.fill}>
      <ScreenHeader title="Bagikan Ayat" />
      {children}
    </View>
  );

  if (loading && !data) return shell(<Loading label="Menyiapkan ayat…" />);
  if (error && !data) return shell(<ErrorState message={error} onRetry={reload} />);
  if (!data || !ayah) {
    return shell(
      <ErrorState message={`Ayat ${ayahNumber} tidak ditemukan dalam surah ini.`} />,
    );
  }

  const arabicFont = ARABIC_FONTS[settings.arabicFont];
  const shownSize = sizeDraft ?? fontSize;

  return shell(
    <ScrollView contentContainerStyle={styles.content}>
      <View ref={cardRef} collapsable={false} style={styles.cardWrap}>
        <LinearGradient
          colors={theme.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <Ionicons name="sparkles" size={22} color={theme.muted} style={styles.sparkle} />

          <Text
            style={[
              styles.arabic,
              {
                color: theme.text,
                fontFamily: arabicFont.key,
                fontSize: shownSize,
                lineHeight: shownSize * arabicFont.lineHeightRatio,
                textAlign: alignment === 'center' ? 'center' : alignment === 'left' ? 'left' : 'right',
              },
            ]}
          >
            {ayah.teksArab}
          </Text>

          {showLatin || showTranslation ? (
            <View style={[styles.rule, { backgroundColor: theme.rule }]} />
          ) : null}

          {showLatin ? (
            <Text style={[styles.latin, { color: theme.muted, textAlign: alignment }]}>
              {ayah.teksLatin.trim()}
            </Text>
          ) : null}

          {showTranslation ? (
            <Text style={[styles.translation, { color: theme.text, textAlign: alignment }]}>
              “{ayah.teksIndonesia}”
            </Text>
          ) : null}

          <Text style={[styles.reference, { color: theme.muted }]}>{reference}</Text>

          <View style={styles.brand}>
            <View style={[styles.brandMark, { borderColor: theme.rule }]}>
              <Ionicons name="book" size={11} color={theme.muted} />
            </View>
            <Text style={[styles.brandText, { color: theme.muted }]}>QUR’AN INDONESIA</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.sectionHead}>
        <SectionTitle>Tema Latar</SectionTitle>
        <Text style={[styles.count, { color: colors.textMuted }]}>{SHARE_THEMES.length} pilihan</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatches}>
        {SHARE_THEMES.map((option) => {
          const active = option.id === theme.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Tema ${option.label}`}
              onPress={() => {
                tapFeedback();
                setTheme(option);
              }}
              style={styles.swatchWrap}
            >
              <LinearGradient
                colors={option.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.swatch,
                  option.outline ? { borderColor: option.outline, borderWidth: 1 } : null,
                  active ? { borderColor: colors.primary, borderWidth: 2.5 } : null,
                ]}
              >
                {active ? <Ionicons name="checkmark" size={20} color={option.text} /> : null}
              </LinearGradient>
              <Text
                style={[
                  styles.swatchLabel,
                  { color: active ? colors.text : colors.textMuted, fontWeight: active ? '700' : '600' },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Ukuran teks</Text>
          <Text style={[styles.rowValue, { color: colors.textMuted }]}>{shownSize}px</Text>
        </View>
        <Slider
          accessibilityLabel="Ukuran teks Arab pada kartu"
          accessibilityValue={{ text: `${shownSize} piksel` }}
          minimumValue={SHARE_FONT_SIZE.min}
          maximumValue={SHARE_FONT_SIZE.max}
          step={SHARE_FONT_SIZE.step}
          value={fontSize}
          onValueChange={setSizeDraft}
          onSlidingComplete={(value) => {
            setSizeDraft(undefined);
            setFontSize(value);
          }}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
          style={styles.slider}
        />

        <Text style={[styles.rowLabel, styles.groupLabel, { color: colors.text }]}>Perataan</Text>
        <View style={[styles.segmented, { backgroundColor: colors.surfaceAlt }]}>
          {ALIGNMENTS.map((option) => {
            const active = option.value === alignment;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  tapFeedback();
                  setAlignment(option.value);
                }}
                style={[styles.segment, active ? { backgroundColor: colors.primary } : null]}
              >
                <Text
                  style={[styles.segmentLabel, { color: active ? colors.primaryText : colors.textMuted }]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Toggle
          label="Sertakan terjemahan"
          value={showTranslation}
          onChange={setShowTranslation}
        />
        <Toggle label="Sertakan transliterasi" value={showLatin} onChange={setShowLatin} />
      </View>

      <Button
        label={busy ? 'Menyiapkan gambar…' : 'Bagikan sebagai gambar'}
        icon="share-outline"
        onPress={() => {
          shareCard().catch(() => {});
        }}
        style={styles.shareButton}
      />
    </ScrollView>,
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const { colors } = useSettings();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => {
        tapFeedback();
        onChange(!value);
      }}
      style={styles.toggleRow}
    >
      <Text style={[styles.rowLabel, styles.toggleLabel, { color: colors.text }]}>{label}</Text>
      <Ionicons
        name={value ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
        color={value ? colors.primary : colors.textFaint}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  cardWrap: { borderRadius: radius.xxl, overflow: 'hidden' },
  card: { padding: spacing.xl, gap: spacing.md, minHeight: 360, justifyContent: 'center' },
  cardInner: { width: '100%' },
  sparkle: { alignSelf: 'center', marginBottom: spacing.sm },
  arabic: { writingDirection: 'rtl', alignSelf: 'stretch' },
  rule: { width: 64, height: 1, alignSelf: 'center', marginVertical: spacing.sm },
  latin: { fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
  translation: { fontSize: 15, lineHeight: 23, fontStyle: 'italic' },
  reference: {
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.sm,
    letterSpacing: 0.3,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'center', marginTop: spacing.xs },
  brandMark: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
  },
  count: { fontSize: 12.5, fontWeight: '600' },
  swatches: { gap: spacing.md, paddingHorizontal: spacing.xs, paddingVertical: spacing.sm },
  swatchWrap: { alignItems: 'center', gap: 6, width: 76 },
  swatch: {
    width: 68,
    height: 68,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchLabel: { fontSize: 11.5, letterSpacing: -0.1 },

  panel: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  rowLabel: { fontSize: 15 },
  rowValue: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  groupLabel: { marginTop: spacing.md, marginBottom: spacing.sm },
  slider: { height: 34 },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: radius.pill, gap: 4 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill },
  segmentLabel: { fontSize: 13, fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  toggleLabel: { flex: 1 },
  shareButton: { marginTop: spacing.sm },
});
