import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlaybackFlags, usePlaybackProgress, usePlayerControls, type RepeatMode } from '@/audio/player';
import { pressFeedback } from '@/components/feedback';
import { IconButton, formatTime, type IconName } from '@/components/ui';
import { useColors } from '@/store/settings';
import { radius, spacing, type as typeScale } from '@/theme';

const REPEAT_ORDER: RepeatMode[] = ['off', 'all', 'one'];

const REPEAT_META: Record<RepeatMode, { icon: IconName; label: string; on: boolean }> = {
  off: { icon: 'repeat', label: 'Ulangi: nonaktif', on: false },
  all: { icon: 'repeat', label: 'Ulangi: semua ayat', on: true },
  one: { icon: 'repeat-outline', label: 'Ulangi: satu ayat', on: true },
};

const SEEK_SETTLED_S = 0.75;

const SEEK_TIMEOUT_MS = 2000;

export function MiniPlayer({ edgeToBottom = false }: { edgeToBottom?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { current, repeat, setRepeat, toggle, stop, next, previous, hasNext, hasPrevious, seekTo } =
    usePlayerControls();
  const { playing, buffering } = usePlaybackFlags();
  const { position, duration } = usePlaybackProgress();

  const [drag, setDrag] = useState<number | undefined>();
  const [anchor, setAnchor] = useState(0);
  const [pending, setPending] = useState<number | undefined>();

  useEffect(() => {
    if (pending === undefined) return;
    if (Math.abs(position - pending) <= SEEK_SETTLED_S) {
      setPending(undefined);
      return;
    }
    const timer = setTimeout(() => setPending(undefined), SEEK_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [pending, position]);

  if (!current) return null;

  const repeatMeta = REPEAT_META[repeat];
  const onCurrentSurah = pathname === `/surah/${current.surah}`;
  const dragging = drag !== undefined;
  const shown = drag ?? pending ?? position;
  const sliderValue = dragging ? anchor : (pending ?? position);
  const scrubbable = duration > 0;
  const subtitle = current.ayah ? `Ayat ${current.ayah}` : 'Surah penuh';

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: colors.surface },
        { borderTopColor: colors.border },
        edgeToBottom && { paddingBottom: insets.bottom },
      ]}
    >
      <Slider
        style={styles.slider}
        accessibilityLabel="Posisi pemutaran"
        accessibilityValue={{ text: `${formatTime(shown)} dari ${formatTime(duration)}` }}
        minimumValue={0}
        maximumValue={scrubbable ? duration : 1}
        value={sliderValue}
        onSlidingStart={() => {
          setAnchor(position);
          setDrag(position);
        }}
        onValueChange={setDrag}
        onSlidingComplete={(value) => {
          setDrag(undefined);
          if (!scrubbable) return;
          setPending(value);
          seekTo(value);
        }}
        tapToSeek
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
        disabled={!scrubbable}
      />

      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Buka ${current.surahName}`}
          disabled={onCurrentSurah}
          onPress={() => router.push(`/surah/${current.surah}?ayah=${current.ayah ?? 1}`)}
          style={styles.meta}
        >
          <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
            {current.surahName}
          </Text>
          <Text numberOfLines={1} style={[styles.subtitle, { color: colors.textMuted }]}>
            {buffering ? 'Memuat…' : `${subtitle} · ${formatTime(shown)} / ${formatTime(duration)}`}
          </Text>
        </Pressable>

        <View style={styles.controls}>
          <IconButton
            name="play-skip-back"
            label="Ayat sebelumnya"
            size={20}
            disabled={!hasPrevious}
            onPress={previous}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Jeda' : 'Putar'}
            hitSlop={6}
            onPress={() => {
              pressFeedback();
              toggle();
            }}
            style={({ pressed }) => [
              styles.play,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name={playing ? 'pause' : 'play'} size={20} color={colors.primaryText} />
          </Pressable>
          <IconButton
            name="play-skip-forward"
            label="Ayat berikutnya"
            size={20}
            disabled={!hasNext}
            onPress={next}
          />
          <IconButton
            name={repeatMeta.icon}
            label={repeatMeta.label}
            size={18}
            color={repeatMeta.on ? colors.primary : colors.textFaint}
            onPress={() => setRepeat(REPEAT_ORDER[(REPEAT_ORDER.indexOf(repeat) + 1) % REPEAT_ORDER.length])}
          />
          <IconButton name="close" label="Tutup pemutar" size={19} onPress={stop} />
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingTop: 2, paddingBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    gap: spacing.sm,
  },
  meta: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...typeScale.heading, fontWeight: '700' },
  subtitle: { ...typeScale.caption, fontVariant: ['tabular-nums'], fontSize: 12 },
  controls: { flexDirection: 'row', alignItems: 'center' },
  play: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xs,
  },
  slider: { height: 26, marginHorizontal: spacing.sm },
});
