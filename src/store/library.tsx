import AsyncStorage from '@react-native-async-storage/async-storage';
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

const BOOKMARKS_KEY = 'equran.bookmarks.v2';
const LEGACY_BOOKMARKS_KEY = 'equran.bookmarks.v1';
const LAST_READ_KEY = 'equran.lastRead.v1';
const HISTORY_KEY = 'equran.history.v1';

const HISTORY_LIMIT = 30;

export type Bookmark = {
  surah: number;
  ayah: number;
  surahName: string;
  arabic: string;
  preview: string;
  tags: string[];
  createdAt: number;
};

type LegacyBookmark = Omit<Bookmark, 'arabic' | 'tags'> & {
  arabic?: string;
  tags?: string[];
};

export type LastRead = {
  surah: number;
  ayah: number;
  surahName: string;
  totalAyah: number;
  updatedAt: number;
};

export type HistoryEntry = {
  surah: number;
  surahName: string;
  ayah: number;
  totalAyah: number;
  visitedAt: number;
};

export const SUGGESTED_TAGS = [
  'Sabar',
  'Syukur',
  'Doa',
  'Tauhid',
  'Akhirat',
  'Ilmu',
  'Keluarga',
  'Rezeki',
] as const;

export const bookmarkKey = (surah: number, ayah: number) => `${surah}:${ayah}`;

type LibraryContextValue = {
  bookmarks: Bookmark[];
  lastRead: LastRead | undefined;
  history: HistoryEntry[];
  ready: boolean;
  isBookmarked: (surah: number, ayah: number) => boolean;
  toggleBookmark: (entry: Omit<Bookmark, 'createdAt' | 'tags'>) => boolean;
  removeBookmark: (surah: number, ayah: number) => void;
  setBookmarkTags: (surah: number, ayah: number, tags: string[]) => void;
  clearBookmarks: () => void;
  setLastRead: (entry: Omit<LastRead, 'updatedAt'>) => void;
  clearLastRead: () => void;
  clearHistory: () => void;
};

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

function normaliseBookmark(entry: LegacyBookmark): Bookmark {
  return { ...entry, arabic: entry.arabic ?? '', tags: entry.tags ?? [] };
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [lastRead, setLastReadState] = useState<LastRead | undefined>();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = await AsyncStorage.multiGet([
          BOOKMARKS_KEY,
          LEGACY_BOOKMARKS_KEY,
          LAST_READ_KEY,
          HISTORY_KEY,
        ]);
        if (!active) return;
        const [current, legacy, rawLastRead, rawHistory] = stored.map(([, value]) => value);

        if (current) {
          setBookmarks((JSON.parse(current) as LegacyBookmark[]).map(normaliseBookmark));
        } else if (legacy) {
          const migrated = (JSON.parse(legacy) as LegacyBookmark[]).map(normaliseBookmark);
          setBookmarks(migrated);
          AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(migrated)).catch(() => {});
        }
        if (rawLastRead) setLastReadState(JSON.parse(rawLastRead) as LastRead);
        if (rawHistory) setHistory(JSON.parse(rawHistory) as HistoryEntry[]);
      } catch {} finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const persistBookmarks = useCallback((next: Bookmark[]) => {
    setBookmarks(next);
    AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const bookmarksRef = useRef(bookmarks);
  bookmarksRef.current = bookmarks;

  const bookmarkIndex = useMemo(
    () => new Set(bookmarks.map((b) => bookmarkKey(b.surah, b.ayah))),
    [bookmarks],
  );

  const isBookmarked = useCallback(
    (surah: number, ayah: number) => bookmarkIndex.has(bookmarkKey(surah, ayah)),
    [bookmarkIndex],
  );

  const toggleBookmark = useCallback<LibraryContextValue['toggleBookmark']>(
    (entry) => {
      const key = bookmarkKey(entry.surah, entry.ayah);
      const current = bookmarksRef.current;
      if (current.some((b) => bookmarkKey(b.surah, b.ayah) === key)) {
        persistBookmarks(current.filter((b) => bookmarkKey(b.surah, b.ayah) !== key));
        return false;
      }
      persistBookmarks([{ ...entry, tags: [], createdAt: Date.now() }, ...current]);
      return true;
    },
    [persistBookmarks],
  );

  const removeBookmark = useCallback<LibraryContextValue['removeBookmark']>(
    (surah, ayah) => {
      const key = bookmarkKey(surah, ayah);
      persistBookmarks(bookmarksRef.current.filter((b) => bookmarkKey(b.surah, b.ayah) !== key));
    },
    [persistBookmarks],
  );

  const setBookmarkTags = useCallback<LibraryContextValue['setBookmarkTags']>(
    (surah, ayah, tags) => {
      const key = bookmarkKey(surah, ayah);
      persistBookmarks(
        bookmarksRef.current.map((b) =>
          bookmarkKey(b.surah, b.ayah) === key ? { ...b, tags } : b,
        ),
      );
    },
    [persistBookmarks],
  );

  const clearBookmarks = useCallback(() => persistBookmarks([]), [persistBookmarks]);

  const setLastRead = useCallback<LibraryContextValue['setLastRead']>((entry) => {
    const next: LastRead = { ...entry, updatedAt: Date.now() };
    setLastReadState((current) =>
      current && current.surah === next.surah && current.ayah === next.ayah ? current : next,
    );
    AsyncStorage.setItem(LAST_READ_KEY, JSON.stringify(next)).catch(() => {});

    setHistory((current) => {
      const rest = current.filter((item) => item.surah !== next.surah);
      const updated: HistoryEntry[] = [
        {
          surah: next.surah,
          surahName: next.surahName,
          ayah: next.ayah,
          totalAyah: next.totalAyah,
          visitedAt: next.updatedAt,
        },
        ...rest,
      ].slice(0, HISTORY_LIMIT);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const clearLastRead = useCallback(() => {
    setLastReadState(undefined);
    AsyncStorage.removeItem(LAST_READ_KEY).catch(() => {});
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    AsyncStorage.removeItem(HISTORY_KEY).catch(() => {});
  }, []);

  const value = useMemo<LibraryContextValue>(
    () => ({
      bookmarks,
      lastRead,
      history,
      ready,
      isBookmarked,
      toggleBookmark,
      removeBookmark,
      setBookmarkTags,
      clearBookmarks,
      setLastRead,
      clearLastRead,
      clearHistory,
    }),
    [
      bookmarks,
      lastRead,
      history,
      ready,
      isBookmarked,
      toggleBookmark,
      removeBookmark,
      setBookmarkTags,
      clearBookmarks,
      setLastRead,
      clearLastRead,
      clearHistory,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary must be used inside a LibraryProvider');
  return context;
}
