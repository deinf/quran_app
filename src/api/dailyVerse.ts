import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSurah, getSurahList, type LoadResult } from './client';
import type { Ayah, SurahSummary } from './types';

const PICK_KEY = 'equran.dailyVerse.v1';

export type DailyVerse = {
  surah: number;
  surahName: string;
  ayah: Ayah;
  totalAyah: number;
};

type StoredPick = {
  day: string;
  surah: number;
  ayahNumber: number;
};

function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function hashDay(day: string): number {
  let hash = 2166136261;
  for (let i = 0; i < day.length; i += 1) {
    hash ^= day.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickForDay(day: string, list: SurahSummary[]): { surah: number; ayahNumber: number } {
  const totalAyah = list.reduce((sum, surah) => sum + surah.jumlahAyat, 0);
  if (totalAyah <= 0) throw new Error('Daftar surah kosong.');
  let offset = hashDay(day) % totalAyah;
  for (const surah of list) {
    if (offset < surah.jumlahAyat) {
      return { surah: surah.nomor, ayahNumber: offset + 1 };
    }
    offset -= surah.jumlahAyat;
  }
  return { surah: 1, ayahNumber: 1 };
}

export async function getDailyVerse(force?: boolean): Promise<LoadResult<DailyVerse>> {
  const day = today();

  let pick: StoredPick | undefined;
  try {
    const raw = await AsyncStorage.getItem(PICK_KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredPick) : undefined;
    if (parsed?.day === day) pick = parsed;
  } catch {}

  if (!pick) {
    const { data: list } = await getSurahList(force);
    const chosen = pickForDay(day, list);
    pick = { day, ...chosen };
    AsyncStorage.setItem(PICK_KEY, JSON.stringify(pick)).catch(() => {});
  }

  const { data: surah, fromCache } = await getSurah(pick.surah, force);
  const ayah = surah.ayat.find((item) => item.nomorAyat === pick.ayahNumber) ?? surah.ayat[0];
  if (!ayah) throw new Error('Ayat harian tidak tersedia.');

  return {
    data: {
      surah: surah.nomor,
      surahName: surah.namaLatin,
      ayah,
      totalAyah: surah.jumlahAyat,
    },
    fromCache,
  };
}
