import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { QariId } from '@/api/types';

const INDEX_KEY = 'equran.offlineAudio.v2';
const LEGACY_INDEX_KEY = 'equran.offlineAudio.v1';
const ROOT_DIR = 'recitation';

const PROGRESS_STEP = 5;

function deferIdle(task: () => void): void {
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void) => void })
    .requestIdleCallback;
  if (typeof idle === 'function') idle(task);
  else setTimeout(task, 0);
}

const slot = (surah: number, qari: QariId) => `${qari}:${surah}`;

export type DownloadTarget = { ayah: number; url: string };

export type DownloadProgress = {
  surah: number;
  qari: QariId;
  done: number;
  total: number;
};

type AudioIndex = Map<string, Set<number>>;

type StoredIndex = Record<string, number[]>;

type OfflineAudioContextValue = {
  index: AudioIndex;
  active: DownloadProgress | undefined;
  ready: boolean;
  storedCount: (surah: number, qari: QariId) => number;
  isAyahDownloaded: (surah: number, ayah: number, qari: QariId) => boolean;
  hasLocalSurah: (surah: number, qari: QariId) => boolean;
  localUri: (surah: number, ayah: number, qari: QariId) => string | undefined;
  download: (surah: number, qari: QariId, targets: DownloadTarget[]) => Promise<number>;
  cancelDownload: () => void;
  removeAyahs: (surah: number, qari: QariId, ayat: number[]) => Promise<void>;
  removeSurah: (surah: number, qari: QariId) => Promise<void>;
  removeAll: () => Promise<void>;
  totalStored: number;
  storedByQari: Record<QariId, { ayat: number; surah: number }>;
  usedBytes: number;
  refreshUsage: () => void;
};

const OfflineAudioContext = createContext<OfflineAudioContextValue | undefined>(undefined);

function surahDir(qari: QariId, surah: number): Directory {
  return new Directory(Paths.document, ROOT_DIR, qari, String(surah));
}

function ayahFile(qari: QariId, surah: number, ayah: number): File {
  return new File(surahDir(qari, surah), `${ayah}.mp3`);
}

function serialise(index: AudioIndex): string {
  const plain: StoredIndex = {};
  index.forEach((ayat, key) => {
    if (ayat.size) plain[key] = [...ayat].sort((a, b) => a - b);
  });
  return JSON.stringify(plain);
}

function parseIndex(raw: string): AudioIndex {
  const plain = JSON.parse(raw) as StoredIndex;
  const index: AudioIndex = new Map();
  for (const [key, ayat] of Object.entries(plain)) {
    if (Array.isArray(ayat) && ayat.length) index.set(key, new Set(ayat));
  }
  return index;
}

function migrateLegacy(slots: string[]): AudioIndex {
  const index: AudioIndex = new Map();
  for (const key of slots) {
    const [qari, surah] = key.split(':');
    if (!qari || !surah) continue;
    try {
      const dir = new Directory(Paths.document, ROOT_DIR, qari, surah);
      if (!dir.exists) continue;
      const ayat = new Set<number>();
      for (const entry of dir.list()) {
        const match = /^(\d+)\.mp3$/.exec(entry.name);
        if (match) ayat.add(Number(match[1]));
      }
      if (ayat.size) index.set(key, ayat);
    } catch {}
  }
  return index;
}

export function OfflineAudioProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState<AudioIndex>(() => new Map());
  const [active, setActive] = useState<DownloadProgress | undefined>();
  const [usedBytes, setUsedBytes] = useState(0);
  const [ready, setReady] = useState(false);

  const cancelled = useRef(false);
  const running = useRef(false);

  const persist = useCallback((mutate: (current: AudioIndex) => AudioIndex) => {
    setIndex((current) => {
      const next = mutate(current);
      AsyncStorage.setItem(INDEX_KEY, serialise(next)).catch(() => {});
      return next;
    });
  }, []);

  const refreshUsage = useCallback(() => {
    deferIdle(() => {
      try {
        const root = new Directory(Paths.document, ROOT_DIR);
        setUsedBytes(root.exists ? (root.size ?? 0) : 0);
      } catch {
        setUsedBytes(0);
      }
    });
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [current, legacy] = (
          await AsyncStorage.multiGet([INDEX_KEY, LEGACY_INDEX_KEY])
        ).map(([, value]) => value);
        if (!alive) return;
        if (current) {
          setIndex(parseIndex(current));
        } else if (legacy) {
          const migrated = migrateLegacy(JSON.parse(legacy) as string[]);
          setIndex(migrated);
          AsyncStorage.setItem(INDEX_KEY, serialise(migrated)).catch(() => {});
        }
      } catch {} finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const storedCount = useCallback(
    (surah: number, qari: QariId) => index.get(slot(surah, qari))?.size ?? 0,
    [index],
  );

  const isAyahDownloaded = useCallback(
    (surah: number, ayah: number, qari: QariId) =>
      index.get(slot(surah, qari))?.has(ayah) ?? false,
    [index],
  );

  const hasLocalSurah = useCallback(
    (surah: number, qari: QariId) => {
      if (!index.get(slot(surah, qari))?.size) return false;
      try {
        return surahDir(qari, surah).exists;
      } catch {
        return false;
      }
    },
    [index],
  );

  const localUri = useCallback(
    (surah: number, ayah: number, qari: QariId) => {
      if (!index.get(slot(surah, qari))?.has(ayah)) return undefined;
      try {
        return ayahFile(qari, surah, ayah).uri;
      } catch {
        return undefined;
      }
    },
    [index],
  );

  const download = useCallback<OfflineAudioContextValue['download']>(
    async (surah, qari, targets) => {
      if (!targets.length) return 0;
      if (running.current) return 0;
      running.current = true;
      cancelled.current = false;
      setActive({ surah, qari, done: 0, total: targets.length });

      const dir = surahDir(qari, surah);
      try {
        if (!dir.exists) dir.create({ intermediates: true });
      } catch {
        running.current = false;
        setActive(undefined);
        return 0;
      }

      const fetched: number[] = [];
      let done = 0;
      let lastPublished = 0;
      for (const { ayah, url } of targets) {
        if (cancelled.current) break;
        const target = ayahFile(qari, surah, ayah);
        try {
          if (!target.exists) await File.downloadFileAsync(url, target);
          fetched.push(ayah);
        } catch {}
        done += 1;
        if (done === targets.length || done - lastPublished >= PROGRESS_STEP) {
          lastPublished = done;
          setActive({ surah, qari, done, total: targets.length });
        }
      }

      if (fetched.length) {
        persist((current) => {
          const next = new Map(current);
          const key = slot(surah, qari);
          next.set(key, new Set([...(current.get(key) ?? []), ...fetched]));
          return next;
        });
      }

      running.current = false;
      setActive(undefined);
      refreshUsage();
      return fetched.length;
    },
    [persist, refreshUsage],
  );

  const cancelDownload = useCallback(() => {
    cancelled.current = true;
  }, []);

  const removeAyahs = useCallback<OfflineAudioContextValue['removeAyahs']>(
    async (surah, qari, ayat) => {
      for (const ayah of ayat) {
        try {
          const target = ayahFile(qari, surah, ayah);
          if (target.exists) target.delete();
        } catch {}
      }
      persist((current) => {
        const key = slot(surah, qari);
        const held = current.get(key);
        if (!held) return current;
        const remaining = new Set(held);
        ayat.forEach((ayah) => remaining.delete(ayah));
        const next = new Map(current);
        if (remaining.size) next.set(key, remaining);
        else next.delete(key);
        return next;
      });
      refreshUsage();
    },
    [persist, refreshUsage],
  );

  const removeSurah = useCallback<OfflineAudioContextValue['removeSurah']>(
    async (surah, qari) => {
      try {
        const dir = surahDir(qari, surah);
        if (dir.exists) dir.delete();
      } catch {}
      persist((current) => {
        const next = new Map(current);
        next.delete(slot(surah, qari));
        return next;
      });
      refreshUsage();
    },
    [persist, refreshUsage],
  );

  const removeAll = useCallback(async () => {
    try {
      const root = new Directory(Paths.document, ROOT_DIR);
      if (root.exists) root.delete();
    } catch {}
    persist(() => new Map());
    refreshUsage();
  }, [persist, refreshUsage]);

  const totalStored = useMemo(() => {
    let total = 0;
    index.forEach((ayat) => {
      total += ayat.size;
    });
    return total;
  }, [index]);

  const storedByQari = useMemo(() => {
    const summary = {} as Record<QariId, { ayat: number; surah: number }>;
    index.forEach((ayat, key) => {
      const qari = key.split(':')[0] as QariId;
      const entry = summary[qari] ?? { ayat: 0, surah: 0 };
      entry.ayat += ayat.size;
      entry.surah += 1;
      summary[qari] = entry;
    });
    return summary;
  }, [index]);

  const value = useMemo<OfflineAudioContextValue>(
    () => ({
      index,
      active,
      ready,
      storedCount,
      isAyahDownloaded,
      hasLocalSurah,
      localUri,
      download,
      cancelDownload,
      removeAyahs,
      removeSurah,
      removeAll,
      totalStored,
      storedByQari,
      usedBytes,
      refreshUsage,
    }),
    [
      index,
      active,
      ready,
      storedCount,
      isAyahDownloaded,
      hasLocalSurah,
      localUri,
      download,
      cancelDownload,
      removeAyahs,
      removeSurah,
      removeAll,
      totalStored,
      storedByQari,
      usedBytes,
      refreshUsage,
    ],
  );

  return <OfflineAudioContext.Provider value={value}>{children}</OfflineAudioContext.Provider>;
}

export function useOfflineAudio(): OfflineAudioContextValue {
  const context = useContext(OfflineAudioContext);
  if (!context) throw new Error('useOfflineAudio must be used inside an OfflineAudioProvider');
  return context;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}
