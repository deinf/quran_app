import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Animated, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

import { getCacheStats } from '@/api/client';
import { PRAYER_LABEL, PRAYER_ORDER, QARI, type PrayerKey } from '@/api/types';
import { tapFeedback } from '@/components/feedback';
import { useToast } from '@/components/toast';
import {
  CollapsingAppBar,
  useCollapsingScroll,
  useFoldedTitleOpacity,
} from '@/components/CollapsingAppBar';
import { QariSheet } from '@/components/QariSheet';
import { ListGroup, MarqueeText, Row, elevation } from '@/components/ui';
import { useOfflineAudio } from '@/offline/audio';
import { countPrayerNotifications, requestNotificationPermission } from '@/shalat/notifications';
import {
  ARABIC_FONT_SIZE,
  useSettings,
  type AdhanSound,
  type ThemePreference,
} from '@/store/settings';
import {
  ARABIC_FONTS,
  SERIF,
  radius,
  spacing,
  type as typeScale,
  type ArabicFontKey,
} from '@/theme';

const TOTAL_SURAH = 114;

const EXPANDED = 176;

const SOUND_OPTIONS: { value: AdhanSound; label: string }[] = [
  { value: 'adhan', label: 'Adzan' },
  { value: 'default', label: 'Nada sistem' },
  { value: 'silent', label: 'Senyap' },
];

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistem' },
  { value: 'light', label: 'Terang' },
  { value: 'dark', label: 'Gelap' },
];

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const API_SITE = 'https://equran.id';

function openApiSite() {
  tapFeedback();
  Linking.openURL(API_SITE).catch(() => {});
}

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, settings, setSetting, resetSettings, theme } = useSettings();
  const toast = useToast();
  const { totalStored, storedByQari, refreshUsage } = useOfflineAudio();

  const [cacheStats, setCacheStats] = useState<{ surah: number; tafsir: number }>();
  const [pendingAlerts, setPendingAlerts] = useState<number>();
  const [fontSizeDraft, setFontSizeDraft] = useState<number | undefined>();

  const refreshStats = useCallback(() => {
    getCacheStats().then(setCacheStats).catch(() => {});
  }, []);

  useEffect(refreshStats, [refreshStats]);
  useEffect(refreshUsage, [refreshUsage]);

  useEffect(() => {
    let alive = true;
    const read = () => {
      countPrayerNotifications()
        .then((count) => {
          if (alive) setPendingAlerts(count);
        })
        .catch(() => {});
    };
    read();
    const timer = setTimeout(read, 1500);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [settings.adhanEnabled, settings.adhanPrayers, settings.shalatKabkota]);

  const font = ARABIC_FONTS[settings.arabicFont];
  const shownSize = fontSizeDraft ?? settings.arabicFontSize;
  const activeQari = QARI.find((q) => q.id === settings.qari);
  const hasLocation = !!settings.shalatProvinsi && !!settings.shalatKabkota;
  const activePrayers = PRAYER_ORDER.filter((key) => settings.adhanPrayers[key]).length;
  const activeStored = storedByQari[settings.qari];
  const [qariSheet, setQariSheet] = useState(false);

  const { scrollY, onScroll, folded } = useCollapsingScroll(EXPANDED, { trackFolded: true });
  const titleOpacity = useFoldedTitleOpacity(scrollY, EXPANDED);
  const allTextDownloaded = (cacheStats?.surah ?? 0) >= TOTAL_SURAH;

  return (
    <View style={styles.fill}>
      <CollapsingAppBar
        scrollY={scrollY}
        expanded={EXPANDED}
        folded={folded}
        squareWhenFolded
        silhouetteScale={0.7}
        silhouetteOpacity={0.05}
        body={
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: colors.onHero }]}>Pengaturan</Text>
            <Text numberOfLines={1} style={[styles.heroMeta, { color: colors.onHeroFaint }]}>
              {activeQari?.name ?? 'Qari'}
              {hasLocation ? ` · ${settings.shalatKabkota}` : ' · lokasi belum dipilih'}
            </Text>
          </View>
        }
        bar={
          <Animated.Text
            numberOfLines={1}
            style={[styles.barTitle, { color: colors.onHero, opacity: titleOpacity }]}
          >
            Pengaturan
          </Animated.Text>
        }
      />
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
      <View style={[styles.preview, { backgroundColor: colors.surface }, elevation(colors.shadow, 1)]}>
        <Text
          style={[
            styles.previewArabic,
            {
              color: colors.arabic,
              fontFamily: font.key,
              fontSize: shownSize,
              lineHeight: shownSize * font.lineHeightRatio,
            },
          ]}
        >
          الْحَمْدُ لِلّٰهِ رَبِّ الْعٰلَمِيْنَ
        </Text>
        {settings.showTranslation ? (
          <Text style={[styles.previewTranslation, { color: colors.textMuted }]}>
            Segala puji bagi Allah, Tuhan seluruh alam.
          </Text>
        ) : null}
      </View>

      <ListGroup title="Tema">
        <View style={styles.segmentRow}>
          <Text style={[styles.rowTitle, { color: colors.text }]}>Tampilan aplikasi</Text>
          <Segmented
            options={THEME_OPTIONS}
            value={settings.themePreference}
            onChange={(value) => setSetting('themePreference', value)}
          />
          {settings.themePreference === 'system' ? (
            <Text style={[styles.note, { color: colors.textFaint }]}>
              Mengikuti tema perangkat, saat ini {theme === 'dark' ? 'gelap' : 'terang'}.
            </Text>
          ) : null}
        </View>
      </ListGroup>

      <ListGroup title="Tampilan ayat">
        <View style={styles.sliderRow}>
          <View style={styles.sliderHead}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Ukuran teks Arab</Text>
            <Text style={[styles.rowValue, { color: colors.textMuted }]}>{shownSize}pt</Text>
          </View>
          <Slider
            accessibilityLabel="Ukuran teks Arab"
            accessibilityValue={{ text: `${shownSize} poin` }}
            minimumValue={ARABIC_FONT_SIZE.min}
            maximumValue={ARABIC_FONT_SIZE.max}
            step={ARABIC_FONT_SIZE.step}
            value={settings.arabicFontSize}
            onValueChange={setFontSizeDraft}
            onSlidingComplete={(value) => {
              setFontSizeDraft(undefined);
              setSetting('arabicFontSize', value);
            }}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />
        </View>

        <View style={styles.segmentRow}>
          <Text style={[styles.rowTitle, { color: colors.text }]}>Jenis huruf</Text>
          <Segmented
            options={(Object.keys(ARABIC_FONTS) as ArabicFontKey[]).map((key) => ({
              value: key,
              label: ARABIC_FONTS[key].label,
            }))}
            value={settings.arabicFont}
            onChange={(value) => setSetting('arabicFont', value)}
          />
          {!font.fullCoverage ? (
            <Text style={[styles.note, { color: colors.textFaint }]}>
              Huruf ini tidak memuat sebagian tanda waqaf, jadi beberapa ayat menampilkan kotak
              kosong.
            </Text>
          ) : null}
        </View>

        <Row
          title="Transliterasi latin"
          right={
            <Toggle
              label="Transliterasi latin"
              value={settings.showLatin}
              onChange={(v) => setSetting('showLatin', v)}
            />
          }
        />
        <Row
          title="Terjemahan"
          right={
            <Toggle
              label="Terjemahan"
              value={settings.showTranslation}
              onChange={(v) => setSetting('showTranslation', v)}
            />
          }
        />
      </ListGroup>

      <ListGroup title="Waktu shalat">
        <Row
          title="Lokasi"
          subtitle={hasLocation ? settings.shalatProvinsi : 'Belum dipilih'}
          value={hasLocation ? settings.shalatKabkota : undefined}
          icon="location-outline"
          onPress={() => router.push('/shalat/lokasi')}
        />
        <Row
          title="Notifikasi adzan"
          subtitle={
            !hasLocation
              ? 'Pilih lokasi terlebih dahulu'
              : !settings.adhanEnabled
                ? 'Nonaktif'
                : pendingAlerts
                  ? `${activePrayers} dari 5 waktu · ${pendingAlerts} pengingat terjadwal`
                  : `${activePrayers} dari 5 waktu aktif`
          }
          icon="notifications-outline"
          right={
            <Toggle
              label="Notifikasi adzan"
              value={settings.adhanEnabled}
              disabled={!hasLocation}
              onChange={(value) => {
                if (!value) {
                  setSetting('adhanEnabled', false);
                  toast.show('Notifikasi adzan dimatikan', { icon: 'notifications-off' });
                  return;
                }
                requestNotificationPermission()
                  .then((outcome) => {
                    if (outcome === 'granted') {
                      setSetting('adhanEnabled', true);
                      toast.show('Notifikasi adzan diaktifkan', { tone: 'success', icon: 'notifications' });
                    } else {
                      toast.show('Izin notifikasi ditolak', { tone: 'danger', icon: 'alert-circle' });
                    }
                  })
                  .catch(() => {
                    toast.show('Gagal meminta izin notifikasi', { tone: 'danger', icon: 'alert-circle' });
                  });
              }}
            />
          }
        />

        {settings.adhanEnabled && hasLocation ? (
          <View style={styles.segmentRow}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Suara</Text>
            <Segmented
              options={SOUND_OPTIONS}
              value={settings.adhanSound}
              onChange={(value) => setSetting('adhanSound', value)}
            />
            <Text style={[styles.note, { color: colors.textFaint }]}>
              Adzan diputar sebagai nada notifikasi selama 28 detik.
            </Text>
          </View>
        ) : null}

        {settings.adhanEnabled && hasLocation ? (
          <View style={styles.prayerRow}>
            <Text style={[styles.rowTitle, styles.prayerLabel, { color: colors.text }]}>
              Waktu yang diingatkan
            </Text>
            <View style={styles.prayerChips}>
              {PRAYER_ORDER.map((key) => {
                const on = settings.adhanPrayers[key];
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={PRAYER_LABEL[key]}
                    onPress={() => {
                      tapFeedback();
                      setSetting('adhanPrayers', { ...settings.adhanPrayers, [key]: !on });
                    }}
                    style={[
                      styles.prayerChip,
                      {
                        backgroundColor: on ? colors.primary : colors.surfaceAlt,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.prayerChipText,
                        { color: on ? colors.primaryText : colors.textMuted },
                      ]}
                    >
                      {PRAYER_LABEL[key]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </ListGroup>

      <ListGroup
        title="Qari"
        footnote="Audio diunduh terpisah untuk tiap qari, jadi berganti qari berarti memakai unduhan yang berbeda."
      >
        <Row
          title="Qari"
          subtitle={
            activeStored
              ? `${activeStored.surah} surah · ${activeStored.ayat} ayat tersimpan`
              : 'Belum ada unduhan'
          }
          icon="person-circle-outline"
          onPress={() => setQariSheet(true)}
          right={
            <View style={styles.qariValue}>
              <MarqueeText style={[styles.qariName, { color: colors.textMuted }]}>
                {activeQari?.name ?? 'Qari'}
              </MarqueeText>
              <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />
            </View>
          }
        />
      </ListGroup>

      <ListGroup title="Pemutar">
        <Row
          title="Lanjut otomatis"
          subtitle="Putar ayat berikutnya setelah selesai"
          right={
            <Toggle
              label="Lanjut otomatis"
              value={settings.autoplayNext}
              onChange={(v) => setSetting('autoplayNext', v)}
            />
          }
        />
        <Row
          title="Gulir mengikuti audio"
          right={
            <Toggle
              label="Gulir mengikuti audio"
              value={settings.followPlayback}
              onChange={(v) => setSetting('followPlayback', v)}
            />
          }
        />
      </ListGroup>

      <ListGroup title="Offline">
        <Row
          title="Unduhan offline"
          subtitle={
            cacheStats
              ? `${cacheStats.surah}/${TOTAL_SURAH} surah teks · ${totalStored} ayat audio`
              : 'Teks surah dan audio murottal'
          }
          icon="cloud-download-outline"
          onPress={() => router.push('/unduhan')}
        />
      </ListGroup>

      <ListGroup
        title="Tentang"
        footnote="Huruf Arab: Scheherazade New dan Amiri (SIL OFL). Adzan: rekaman domain publik (CC0) dari Wikimedia Commons."
      >
        <Row
          title="EQuran.id"
          subtitle="Sumber teks, terjemahan, tafsir, murottal, doa dan jadwal shalat"
          icon="server-outline"
          onPress={openApiSite}
          accessibilityLabel="Sumber data EQuran.id, buka equran.id di peramban"
        />

        <Row title="Versi aplikasi" icon="information-circle-outline" value={APP_VERSION} />

        <Row
          title="Kembalikan pengaturan awal"
          icon="refresh-outline"
          destructive
          onPress={() =>
            Alert.alert('Kembalikan pengaturan awal?', 'Semua preferensi akan direset.', [
              { text: 'Batal', style: 'cancel' },
              {
                text: 'Reset',
                style: 'destructive',
                onPress: () => {
                  resetSettings();
                  toast.show('Pengaturan direset', { icon: 'refresh' });
                },
              },
            ])
          }
        />
      </ListGroup>
      </Animated.ScrollView>

      <QariSheet
        visible={qariSheet}
        onClose={() => setQariSheet(false)}
        onSelect={(qari) => {
          setQariSheet(false);
          setSetting('qari', qari);
        }}
      />
    </View>
  );
}

function Toggle({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const { colors } = useSettings();
  return (
    <Switch
      accessibilityLabel={label}
      disabled={disabled}
      value={value}
      onValueChange={(next) => {
        tapFeedback();
        onChange(next);
      }}
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor={colors.surface}
      style={disabled ? styles.disabled : undefined}
    />
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useSettings();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surfaceAlt }]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              tapFeedback();
              onChange(option.value);
            }}
            style={[styles.segment, active && { backgroundColor: colors.surface }]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.segmentLabel,
                { color: active ? colors.text : colors.textMuted, fontWeight: active ? '700' : '500' },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: EXPANDED + spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },

  qariValue: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: 168 },
  qariName: typeScale.body,
  heroText: { alignItems: 'center', gap: 2 },
  heroTitle: { ...typeScale.display, fontFamily: SERIF },
  heroMeta: typeScale.caption,
  barTitle: { ...typeScale.heading, fontSize: 17, flex: 1, textAlign: 'center' },
  preview: {
    borderRadius: radius.xxl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  previewArabic: { textAlign: 'right', writingDirection: 'rtl' },
  previewTranslation: { ...typeScale.caption, textAlign: 'right' },

  rowTitle: typeScale.heading,
  rowValue: typeScale.body,
  note: { ...typeScale.caption, marginTop: spacing.xs, lineHeight: 18 },

  sliderRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  sliderHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  segmentRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  progressRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },

  prayerRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  prayerLabel: { marginBottom: 2 },
  prayerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  prayerChip: {
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  prayerChipText: { ...typeScale.caption, fontWeight: '700' },

  segmented: { flexDirection: 'row', padding: 4, borderRadius: radius.pill, gap: 4 },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  segmentLabel: { ...typeScale.caption, fontWeight: '600' },

  disabled: { opacity: 0.4 },
});
