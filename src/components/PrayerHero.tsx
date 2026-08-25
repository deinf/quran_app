import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { getJadwalShalat } from '@/api/client';
import type { JadwalHarian } from '@/api/types';
import { useResource } from '@/api/useResource';
import { CollapsingAppBar } from '@/components/CollapsingAppBar';
import { IconButton, type IconName } from '@/components/ui';
import { findNextPrayer, formatCountdown, isoToday } from '@/shalat/schedule';
import { useSettings } from '@/store/settings';
import { HAIRLINE, radius, spacing, type as typeScale } from '@/theme';

export const HOME_STRIP_HEIGHT = 76;

export const HOME_HERO_EXPANDED = 316;

const TICK_MS = 30_000;

const STRIP: { key: keyof JadwalHarian; label: string; icon: IconName }[] = [
  { key: 'subuh', label: 'Subuh', icon: 'moon-outline' },
  { key: 'terbit', label: 'Terbit', icon: 'sunny-outline' },
  { key: 'dzuhur', label: 'Dzuhur', icon: 'sunny-outline' },
  { key: 'ashar', label: 'Ashar', icon: 'partly-sunny-outline' },
  { key: 'maghrib', label: 'Maghrib', icon: 'cloudy-night-outline' },
  { key: 'isya', label: 'Isya', icon: 'moon' },
];

function hijriDate(now: Date): string | undefined {
  try {
    const formatted = new Intl.DateTimeFormat('id-TN-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(now);
    return formatted.includes(String(now.getFullYear())) ? undefined : formatted;
  } catch {
    return undefined;
  }
}

export function PrayerHero({ scrollY }: { scrollY: Animated.Value }) {
  const router = useRouter();
  const { colors, settings } = useSettings();
  const { shalatProvinsi: provinsi, shalatKabkota: kabkota } = settings;
  const hasLocation = !!provinsi && !!kabkota;

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const loader = useCallback(
    (force: boolean) => {
      if (!hasLocation) return Promise.reject(new Error('Lokasi belum dipilih.'));
      return getJadwalShalat(provinsi, kabkota, month, year, force);
    },
    [hasLocation, provinsi, kabkota, month, year],
  );
  const { data, error, reload } = useResource(loader, [provinsi, kabkota, month, year]);

  const today = isoToday(now);
  const index = useMemo(
    () => data?.jadwal.findIndex((day) => day.tanggal_lengkap === today) ?? -1,
    [data, today],
  );
  const day = index >= 0 ? data?.jadwal[index] : undefined;
  const next = useMemo(
    () => (day ? findNextPrayer(day, now, data?.jadwal[index + 1]?.subuh) : undefined),
    [day, now, data, index],
  );

  const dateLine = useMemo(
    () => hijriDate(now) ?? (day ? `${day.hari}, ${day.tanggal}` : ''),
    [now, day],
  );

  return (
    <CollapsingAppBar
      scrollY={scrollY}
      expanded={HOME_HERO_EXPANDED}
      stickyHeight={HOME_STRIP_HEIGHT}
      body={
        <View style={styles.clock}>
          {dateLine ? (
            <Text style={[styles.date, { color: colors.onHero }]}>{dateLine}</Text>
          ) : null}

          {!hasLocation ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/shalat/lokasi')}
              style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.ctaTitle, { color: colors.onHero }]}>Atur lokasi shalat</Text>
              <Text style={[styles.ctaBody, { color: colors.onHeroFaint }]}>
                Pilih kabupaten/kota untuk melihat jadwal harian
              </Text>
            </Pressable>
          ) : error && !data ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Jadwal gagal dimuat. Ketuk untuk mencoba lagi"
              onPress={reload}
              style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.ctaTitle, { color: colors.onHero }]}>Jadwal belum dimuat</Text>
              <Text style={[styles.ctaBody, { color: colors.onHeroFaint }]}>
                Ketuk untuk mencoba lagi
              </Text>
            </Pressable>
          ) : next ? (
            <>
              <Text style={[styles.time, { color: colors.onHero }]}>{next.time}</Text>
              <Text style={[styles.away, { color: colors.onHeroFaint }]}>
                {next.label}
                {next.tomorrow ? ' besok' : ''} tinggal{' '}
                <Text style={{ color: colors.accent }}>{formatCountdown(next.minutesAway)}</Text>
              </Text>
            </>
          ) : (
            <View style={styles.clockSkeleton} />
          )}
        </View>
      }
      sticky={
        <View style={[styles.strip, { borderTopColor: colors.onHeroSoft }]}>
          {STRIP.map((item) => {
            const active = next && !next.tomorrow && item.key === next.key;
            const tint = active ? colors.accent : colors.onHero;
            return (
              <View key={item.key} style={styles.stripItem}>
                <Text
                  numberOfLines={1}
                  style={[styles.stripLabel, { color: tint, opacity: active ? 1 : 0.7 }]}
                >
                  {item.label}
                </Text>
                <Ionicons
                  name={item.icon}
                  size={17}
                  color={tint}
                  style={{ opacity: active ? 1 : 0.8 }}
                />
                <Text style={[styles.stripTime, { color: tint, opacity: active ? 1 : 0.9 }]}>
                  {day ? (day[item.key] as string) : '—'}
                </Text>
              </View>
            );
          })}
        </View>
      }
      bar={
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              hasLocation ? `Lokasi ${kabkota}. Ketuk untuk mengubah` : 'Pilih lokasi shalat'
            }
            onPress={() => router.push('/shalat/lokasi')}
            style={({ pressed }) => [
              styles.place,
              { backgroundColor: colors.onHeroSoft, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="location" size={13} color={colors.onHero} />
            <Text numberOfLines={1} style={[styles.placeText, { color: colors.onHero }]}>
              {hasLocation ? kabkota : 'Pilih lokasi'}
            </Text>
          </Pressable>

          <View style={styles.topActions}>
            <IconButton
              name="search-outline"
              label="Cari surah"
              size={21}
              color={colors.onHero}
              onPress={() => router.push('/surah-list')}
            />
            <IconButton
              name="settings-outline"
              label="Pengaturan"
              size={21}
              color={colors.onHero}
              onPress={() => router.push('/settings')}
            />
          </View>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  clock: { alignItems: 'center', gap: 2 },
  date: { ...typeScale.caption, opacity: 0.8 },
  time: { ...typeScale.displayLarge, fontVariant: ['tabular-nums'] },
  away: { ...typeScale.caption, textAlign: 'center' },
  clockSkeleton: { height: 56 + 19 },
  cta: { alignItems: 'center', gap: 3, paddingVertical: spacing.lg },
  ctaTitle: typeScale.title,
  ctaBody: { ...typeScale.caption, textAlign: 'center' },

  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    flexShrink: 1,
    marginLeft: spacing.sm,
  },
  placeText: { ...typeScale.caption, fontWeight: '600', flexShrink: 1 },
  topActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },

  strip: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderTopWidth: HAIRLINE,
  },
  stripItem: { flex: 1, alignItems: 'center', gap: 5 },
  stripLabel: { ...typeScale.label, fontSize: 10.5, letterSpacing: 0.2 },
  stripTime: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
