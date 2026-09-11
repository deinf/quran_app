import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getJadwalShalat } from '@/api/client';
import { PRAYER_LABEL, PRAYER_ORDER, type JadwalHarian } from '@/api/types';
import { useResource } from '@/api/useResource';
import { MiniPlayer } from '@/components/MiniPlayer';
import { MosqueSilhouette } from '@/components/MosqueSilhouette';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button, EmptyState, ErrorState, Loading, OfflineBanner, elevation } from '@/components/ui';
import { useIsOffline } from '@/offline/network';
import { MONTH_NAMES, findNextPrayer, formatCountdown, formatLongDate, isoToday } from '@/shalat/schedule';
import { useSettings } from '@/store/settings';
import { radius, spacing, type as typeScale } from '@/theme';

export default function JadwalShalatScreen() {
  const router = useRouter();
  const { colors, settings } = useSettings();
  const offline = useIsOffline();

  const [period, setPeriod] = useState(() => {
    const today = new Date();
    return { month: today.getMonth() + 1, year: today.getFullYear() };
  });
  const { month, year } = period;

  const shiftMonth = useCallback((delta: number) => {
    setPeriod((current) => {
      const zeroBased = current.month - 1 + delta;
      return {
        month: ((zeroBased % 12) + 12) % 12 + 1,
        year: current.year + Math.floor(zeroBased / 12),
      };
    });
  }, []);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const { shalatProvinsi: provinsi, shalatKabkota: kabkota } = settings;
  const hasLocation = !!provinsi && !!kabkota;

  const loader = useCallback(
    (force: boolean) => {
      if (!hasLocation) return Promise.reject(new Error('Lokasi belum dipilih.'));
      return getJadwalShalat(provinsi, kabkota, month, year, force);
    },
    [hasLocation, provinsi, kabkota, month, year],
  );
  const { data, error, loading, fromCache, reload } = useResource(loader, [
    provinsi,
    kabkota,
    month,
    year,
  ]);

  const today = isoToday(now);
  const todayIndex = useMemo(
    () => data?.jadwal.findIndex((day) => day.tanggal_lengkap === today) ?? -1,
    [data, today],
  );
  const todayEntry = todayIndex >= 0 ? data?.jadwal[todayIndex] : undefined;
  const next = useMemo(() => {
    if (!todayEntry) return undefined;
    const tomorrow = data?.jadwal[todayIndex + 1];
    return findNextPrayer(todayEntry, now, tomorrow?.subuh);
  }, [todayEntry, data, todayIndex, now]);

  const shell = (children: ReactNode) => (
    <View style={styles.fill}>
      <ScreenHeader title="Jadwal Shalat" />
      {children}
    </View>
  );

  if (!hasLocation) {
    return shell(
      <>
        <View style={styles.centre}>
          <Ionicons name="location-outline" size={46} color={colors.textFaint} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Pilih lokasi</Text>
          <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
            Jadwal shalat mengikuti kabupaten/kota. Pilih lokasimu untuk melihat jadwal bulanan.
          </Text>
          <Button
            label="Pilih lokasi"
            icon="location"
            onPress={() => router.push('/shalat/lokasi')}
            style={styles.emptyButton}
          />
        </View>
        <MiniPlayer edgeToBottom />
      </>,
    );
  }

  if (loading && !data) return shell(<Loading label="Memuat jadwal shalat…" />);
  if (error && !data) return shell(<ErrorState message={error} onRetry={reload} />);

  return shell(
    <>
      <FlatList
        data={data?.jadwal ?? []}
        keyExtractor={(item) => item.tanggal_lengkap}
        contentContainerStyle={styles.listContent}
        initialNumToRender={12}
        onRefresh={reload}
        refreshing={loading}
        ListHeaderComponent={
          <View style={styles.header}>
            {offline ? <OfflineBanner /> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Lokasi ${kabkota}, ${provinsi}. Ketuk untuk mengubah`}
              onPress={() => router.push('/shalat/lokasi')}
              style={({ pressed }) => [
                styles.location,
                { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons name="location" size={17} color={colors.primary} />
              <View style={styles.locationBody}>
                <Text style={[styles.locationName, { color: colors.text }]}>{kabkota}</Text>
                <Text style={[styles.locationSub, { color: colors.textMuted }]}>{provinsi}</Text>
              </View>
              <Text style={[styles.change, { color: colors.primary }]}>Ubah</Text>
            </Pressable>

            {next && todayEntry ? (
              <View style={[styles.nextWrap, elevation(colors.shadow, 2)]}>
                <LinearGradient
                  colors={colors.heroGradient}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={styles.nextCard}
                >
                  <MosqueSilhouette color={colors.onHero} scale={0.55} opacity={0.06} />
                  <Text style={[styles.nextLabel, { color: colors.onHeroFaint }]}>
                    {next.tomorrow ? 'Berikutnya, besok' : 'Berikutnya'}
                  </Text>
                  <Text style={[styles.nextName, { color: colors.onHero }]}>{next.label}</Text>
                  <Text style={[styles.nextTime, { color: colors.onHero }]}>{next.time}</Text>
                  <View style={[styles.nextPill, { backgroundColor: colors.onHeroSoft }]}>
                    <Ionicons name="time-outline" size={13} color={colors.onHeroAccent} />
                    <Text style={[styles.nextAway, { color: colors.onHeroAccent }]}>
                      {formatCountdown(next.minutesAway)} lagi
                    </Text>
                  </View>
                  <Text style={[styles.nextDate, { color: colors.onHeroFaint }]}>
                    {formatLongDate(todayEntry)}
                  </Text>
                </LinearGradient>
              </View>
            ) : null}

            <View style={[styles.monthRow, { backgroundColor: colors.surface }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Bulan sebelumnya"
                onPress={() => shiftMonth(-1)}
                style={({ pressed }) => [styles.monthButton, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </Pressable>
              <Text style={[styles.monthLabel, { color: colors.text }]}>
                {data?.bulan_nama ?? MONTH_NAMES[month - 1]} {year}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Bulan berikutnya"
                onPress={() => shiftMonth(1)}
                style={({ pressed }) => [styles.monthButton, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </Pressable>
            </View>

            {fromCache && !offline ? (
              <Text style={[styles.cacheNote, { color: colors.textFaint }]}>
                Ditampilkan dari salinan offline
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => <DayRow day={item} isToday={item.tanggal_lengkap === today} />}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="Jadwal belum tersedia"
            message="Data untuk bulan ini belum ada. Coba bulan lain."
          />
        }
      />
      <MiniPlayer edgeToBottom />
    </>,
  );
}

function DayRow({ day, isToday }: { day: JadwalHarian; isToday: boolean }) {
  const { colors } = useSettings();
  return (
    <View
      style={[
        styles.dayCard,
        { backgroundColor: isToday ? colors.highlight : colors.surface },
        isToday ? elevation(colors.shadow, 2) : elevation(colors.shadow, 1),
      ]}
    >
      <View style={styles.dayHead}>
        <View style={[styles.dayBadge, { backgroundColor: isToday ? colors.primary : colors.primarySoft }]}>
          <Text style={[styles.dayNumber, { color: isToday ? colors.primaryText : colors.primary }]}>
            {day.tanggal}
          </Text>
        </View>
        <View style={styles.dayMeta}>
          <Text style={[styles.dayName, { color: colors.text }]}>{day.hari}</Text>
          <Text style={[styles.dayImsak, { color: colors.textMuted }]}>Imsak {day.imsak}</Text>
        </View>
        {isToday ? (
          <View style={[styles.todayPill, { backgroundColor: colors.primary }]}>
            <Text style={[styles.todayText, { color: colors.primaryText }]}>Hari ini</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.times}>
        {PRAYER_ORDER.map((key) => (
          <View key={key} style={styles.time}>
            <Text style={[styles.timeLabel, { color: colors.textFaint }]}>{PRAYER_LABEL[key]}</Text>
            <Text style={[styles.timeValue, { color: colors.text }]}>{day[key]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const TICK_MS = 30_000;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { ...typeScale.title, marginTop: spacing.sm },
  emptyBody: { ...typeScale.body, textAlign: 'center' },
  emptyButton: { marginTop: spacing.lg },

  listContent: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  header: { gap: spacing.md },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
  },
  locationBody: { flex: 1, gap: 1 },
  locationName: typeScale.heading,
  locationSub: typeScale.caption,
  change: { ...typeScale.caption, fontWeight: '700' },

  nextWrap: { borderRadius: radius.xxl, overflow: 'hidden' },
  nextCard: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.lg, alignItems: 'center', gap: 3 },
  nextLabel: { ...typeScale.label, textTransform: 'uppercase' },
  nextName: typeScale.title,
  nextTime: { ...typeScale.displayLarge, fontVariant: ['tabular-nums'] },
  nextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
  },
  nextAway: { ...typeScale.caption, fontWeight: '700' },
  nextDate: { ...typeScale.caption, marginTop: spacing.sm, fontWeight: '600' },

  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { ...typeScale.heading, fontWeight: '700' },
  cacheNote: { ...typeScale.caption, textAlign: 'center' },

  dayCard: { borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dayBadge: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: { ...typeScale.heading, fontWeight: '800', fontVariant: ['tabular-nums'] },
  dayMeta: { flex: 1, gap: 1 },
  dayName: typeScale.heading,
  dayImsak: typeScale.caption,
  todayPill: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  todayText: typeScale.label,
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { alignItems: 'center', gap: 3, flex: 1 },
  timeLabel: { ...typeScale.label, textTransform: 'uppercase', letterSpacing: 0.4 },
  timeValue: { ...typeScale.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
