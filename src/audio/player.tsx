import {
  requestNotificationPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioStatus,
} from 'expo-audio';
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useSettings } from '@/store/settings';

export type Track = {
  uri: string;
  surah: number;
  surahName: string;
  ayah?: number;
  qariName: string;
};

export type RepeatMode = 'off' | 'one' | 'all';

type Queue = {
  tracks: Track[];
  index: number;
};

const EMPTY_QUEUE: Queue = { tracks: [], index: 0 };

const UPDATE_INTERVAL_MS = 250;

const NATURAL_END_TOLERANCE_S = (UPDATE_INTERVAL_MS / 1000) * 3;

type ControlsValue = {
  queue: Queue;
  current: Track | undefined;
  repeat: RepeatMode;
  setRepeat: (mode: RepeatMode) => void;
  playQueue: (tracks: Track[], startIndex?: number, options?: { toggle?: boolean }) => void;
  toggle: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (seconds: number) => void;
  hasNext: boolean;
  hasPrevious: boolean;
};

const ControlsContext = createContext<ControlsValue | undefined>(undefined);

type PlaybackFlags = {
  playing: boolean;
  buffering: boolean;
  error: string | undefined;
};

const IDLE_FLAGS: PlaybackFlags = { playing: false, buffering: false, error: undefined };

const FlagsContext = createContext<PlaybackFlags>(IDLE_FLAGS);

type PlaybackProgress = {
  position: number;
  duration: number;
};

const IDLE_PROGRESS: PlaybackProgress = { position: 0, duration: 0 };

const ProgressContext = createContext<PlaybackProgress>(IDLE_PROGRESS);

export function AudioProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const player = useAudioPlayer(null, { updateInterval: UPDATE_INTERVAL_MS });
  const [queue, setQueue] = useState<Queue>(EMPTY_QUEUE);
  const [repeat, setRepeat] = useState<RepeatMode>('off');

  const queueRef = useRef(queue);
  queueRef.current = queue;
  const repeatRef = useRef(repeat);
  repeatRef.current = repeat;
  const autoplayRef = useRef(settings.autoplayNext);
  autoplayRef.current = settings.autoplayNext;
  const endHandled = useRef(false);
  const lastPosition = useRef(0);
  const [seekPosition, setSeekPosition] = useState<number | undefined>();
  const seekPositionRef = useRef<number | undefined>(undefined);
  const rememberSeek = useCallback((seconds: number | undefined) => {
    seekPositionRef.current = seconds;
    setSeekPosition(seconds);
  }, []);
  const seekInFlight = useRef<Promise<void> | undefined>(undefined);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => {});
    requestNotificationPermissionsAsync().catch(() => {});
  }, []);

  const load = useCallback(
    (tracks: Track[], index: number, autoPlay: boolean) => {
      const track = tracks[index];
      if (!track) return;
      setQueue({ tracks, index });
      player.replace({ uri: track.uri, name: `${track.surahName} : ${track.ayah ?? 'full'}` });
      const seekable = track.ayah === undefined;
      player.setActiveForLockScreen(
        true,
        {
          title: track.ayah ? `${track.surahName} · Ayat ${track.ayah}` : `${track.surahName} · Murottal`,
          artist: track.qariName,
          albumTitle: 'Al-Qur’an',
        },
        { showSeekForward: seekable, showSeekBackward: seekable },
      );
      endHandled.current = false;
      lastPosition.current = 0;
      rememberSeek(undefined);
      if (autoPlay) player.play();
    },
    [player, rememberSeek],
  );

  const goTo = useCallback((index: number) => load(queueRef.current.tracks, index, true), [load]);

  useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      if (status.playing && seekPositionRef.current !== undefined) rememberSeek(undefined);

      if (!status.didJustFinish) {
        if (status.playing) {
          endHandled.current = false;
          lastPosition.current = status.currentTime;
        }
        return;
      }
      if (endHandled.current) return;
      endHandled.current = true;

      const { tracks, index } = queueRef.current;
      if (!tracks[index]) return;

      const duration = Number.isFinite(status.duration) ? status.duration : 0;
      const playedThrough =
        duration <= 0 || duration - lastPosition.current <= NATURAL_END_TOLERANCE_S;
      if (!playedThrough) {
        return;
      }

      if (repeatRef.current === 'one') {
        player.seekTo(0).then(() => player.play()).catch(() => {});
        return;
      }
      if (!autoplayRef.current && repeatRef.current === 'off') return;

      if (index + 1 < tracks.length) {
        goTo(index + 1);
        return;
      }
      if (repeatRef.current === 'all' && tracks.length > 0) {
        goTo(0);
      }
    });
    return () => subscription.remove();
  }, [player, goTo, rememberSeek]);

  const playQueue = useCallback<ControlsValue['playQueue']>(
    (tracks, startIndex = 0, options) => {
      const target = tracks[startIndex];
      const active = queueRef.current.tracks[queueRef.current.index];
      if (options?.toggle && target && active && target.uri === active.uri) {
        if (player.playing) player.pause();
        else restart(player, seekPositionRef.current, seekInFlight.current);
        setQueue({ tracks, index: startIndex });
        return;
      }
      load(tracks, startIndex, true);
    },
    [load, player],
  );

  const toggle = useCallback(() => {
    if (!queueRef.current.tracks.length) return;
    if (player.playing) player.pause();
    else restart(player, seekPositionRef.current, seekInFlight.current);
  }, [player]);

  const stop = useCallback(() => {
    player.pause();
    player.clearLockScreenControls();
    rememberSeek(undefined);
    setQueue(EMPTY_QUEUE);
  }, [player, rememberSeek]);

  const next = useCallback(() => {
    const { tracks, index } = queueRef.current;
    if (index + 1 < tracks.length) goTo(index + 1);
  }, [goTo]);

  const previous = useCallback(() => {
    const { index } = queueRef.current;
    if (index > 0) goTo(index - 1);
  }, [goTo]);

  const seekTo = useCallback(
    (seconds: number) => {
      lastPosition.current = seconds;
      endHandled.current = false;
      rememberSeek(seconds);
      const seek = player.seekTo(seconds).catch(() => {});
      seekInFlight.current = seek;
      void seek.then(() => {
        if (seekInFlight.current === seek) seekInFlight.current = undefined;
      });
    },
    [player, rememberSeek],
  );

  const controls = useMemo<ControlsValue>(
    () => ({
      queue,
      current: queue.tracks[queue.index],
      repeat,
      setRepeat,
      playQueue,
      toggle,
      stop,
      next,
      previous,
      seekTo,
      hasNext: queue.index + 1 < queue.tracks.length,
      hasPrevious: queue.index > 0,
    }),
    [queue, repeat, playQueue, toggle, stop, next, previous, seekTo],
  );

  return (
    <ControlsContext.Provider value={controls}>
      <StatusBridge player={player} seekPosition={seekPosition}>
        {children}
      </StatusBridge>
    </ControlsContext.Provider>
  );
}

function restart(
  player: ReturnType<typeof useAudioPlayer>,
  seekTarget?: number,
  seekInFlight?: Promise<void>,
): void {
  const { duration } = player;
  const currentTime = seekTarget ?? player.currentTime;
  const atEnd = duration > 0 && currentTime >= duration - 0.25;
  const play = () => player.play();

  if (atEnd) {
    player.seekTo(0).then(play).catch(play);
    return;
  }
  if (seekInFlight) {
    seekInFlight.then(play).catch(play);
    return;
  }
  play();
}

const StatusBridge = memo(function StatusBridge({
  player,
  seekPosition,
  children,
}: {
  player: ReturnType<typeof useAudioPlayer>;
  seekPosition: number | undefined;
  children: ReactNode;
}) {
  const status = useAudioPlayerStatus(player);

  const flags = useMemo<PlaybackFlags>(
    () => ({
      playing: status.playing,
      buffering: status.isBuffering,
      error: status.error ?? undefined,
    }),
    [status.playing, status.isBuffering, status.error],
  );

  const progress = useMemo<PlaybackProgress>(
    () => ({
      position: seekPosition ?? status.currentTime,
      duration: Number.isFinite(status.duration) ? status.duration : 0,
    }),
    [seekPosition, status.currentTime, status.duration],
  );

  return (
    <FlagsContext.Provider value={flags}>
      <ProgressContext.Provider value={progress}>{children}</ProgressContext.Provider>
    </FlagsContext.Provider>
  );
});

export function usePlayerControls(): ControlsValue {
  const context = useContext(ControlsContext);
  if (!context) throw new Error('usePlayerControls must be used inside an AudioProvider');
  return context;
}

export function usePlaybackFlags(): PlaybackFlags {
  return useContext(FlagsContext);
}

export function usePlaybackProgress(): PlaybackProgress {
  return useContext(ProgressContext);
}
