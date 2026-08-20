import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ApiEnvelope, Doa, JadwalShalat, SurahDetail, SurahSummary, TafsirDetail } from './types';

const BASE_V2 = 'https://equran.id/api/v2';
const BASE_V1 = 'https://equran.id/api';
const CACHE_PREFIX = 'equran.cache.';
const REQUEST_TIMEOUT_MS = 20000;

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type CacheEntry<T> = { savedAt: number; data: T };

const memory = new Map<string, CacheEntry<unknown>>();

const inflight = new Map<string, Promise<unknown>>();

export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: 'offline' | 'http' | 'parse',
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function readCache<T>(key: string): Promise<CacheEntry<T> | undefined> {
  const hit = memory.get(key) as CacheEntry<T> | undefined;
  if (hit) return hit;
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    memory.set(key, parsed);
    return parsed;
  } catch {
    return undefined;
  }
}

async function writeCache<T>(key: string, data: T): Promise<void> {
  const entry: CacheEntry<T> = { savedAt: Date.now(), data };
  memory.set(key, entry);
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {}
}

async function fetchJson<T>(url: string, payload?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: payload === undefined ? 'GET' : 'POST',
      headers:
        payload === undefined
          ? { Accept: 'application/json' }
          : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new ApiError(`Server membalas ${response.status}.`, 'http');
    }
    const envelope = (await response.json()) as ApiEnvelope<T>;
    if (!envelope || typeof envelope !== 'object' || envelope.data === undefined) {
      throw new ApiError('Format data dari server tidak dikenali.', 'parse');
    }
    return envelope.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Tidak dapat menghubungi server. Periksa koneksi internet.', 'offline');
  } finally {
    clearTimeout(timer);
  }
}

export type LoadResult<T> = {
  data: T;
  fromCache: boolean;
};

async function load<T>(
  key: string,
  url: string,
  force = false,
  options?: { body?: unknown; ttlMs?: number },
): Promise<LoadResult<T>> {
  const ttl = options?.ttlMs ?? CACHE_TTL_MS;
  const cached = await readCache<T>(key);
  if (!force && cached && Date.now() - cached.savedAt < ttl) {
    return { data: cached.data, fromCache: true };
  }

  const pending = (inflight.get(key) as Promise<T> | undefined) ?? fetchJson<T>(url, options?.body);
  inflight.set(key, pending);
  try {
    const data = await pending;
    await writeCache(key, data);
    return { data, fromCache: false };
  } catch (error) {
    if (cached) return { data: cached.data, fromCache: true };
    throw error;
  } finally {
    inflight.delete(key);
  }
}

export function getSurahList(force?: boolean): Promise<LoadResult<SurahSummary[]>> {
  return load<SurahSummary[]>('surat', `${BASE_V2}/surat`, force);
}

export function getSurah(nomor: number, force?: boolean): Promise<LoadResult<SurahDetail>> {
  return load<SurahDetail>(`surat.${nomor}`, `${BASE_V2}/surat/${nomor}`, force);
}

export function getTafsir(nomor: number, force?: boolean): Promise<LoadResult<TafsirDetail>> {
  return load<TafsirDetail>(`tafsir.${nomor}`, `${BASE_V2}/tafsir/${nomor}`, force);
}

export function getDoaList(force?: boolean): Promise<LoadResult<Doa[]>> {
  return load<Doa[]>('doa', `${BASE_V1}/doa`, force);
}

export function getProvinsiList(force?: boolean): Promise<LoadResult<string[]>> {
  return load<string[]>('shalat.provinsi', `${BASE_V2}/shalat/provinsi`, force);
}

export function getKabkotaList(provinsi: string, force?: boolean): Promise<LoadResult<string[]>> {
  return load<string[]>(`shalat.kabkota.${provinsi}`, `${BASE_V2}/shalat/kabkota`, force, {
    body: { provinsi },
  });
}

export function getJadwalShalat(
  provinsi: string,
  kabkota: string,
  bulan: number,
  tahun: number,
  force?: boolean,
): Promise<LoadResult<JadwalShalat>> {
  return load<JadwalShalat>(
    `shalat.${provinsi}.${kabkota}.${tahun}-${bulan}`,
    `${BASE_V2}/shalat`,
    force,
    { body: { provinsi, kabkota, bulan, tahun }, ttlMs: 7 * 24 * 60 * 60 * 1000 },
  );
}

export async function prefetchAllSurah(
  onProgress: (done: number, total: number) => void,
  signal?: { aborted: boolean },
): Promise<{ completed: number; failed: number }> {
  const TOTAL = 114;
  let completed = 0;
  let failed = 0;
  for (let nomor = 1; nomor <= TOTAL; nomor += 1) {
    if (signal?.aborted) break;
    try {
      await getSurah(nomor);
      completed += 1;
    } catch {
      failed += 1;
    }
    onProgress(nomor, TOTAL);
  }
  return { completed, failed };
}

export async function getCacheStats(): Promise<{ surah: number; tafsir: number }> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    return {
      surah: mine.filter((k) => k.startsWith(`${CACHE_PREFIX}surat.`)).length,
      tafsir: mine.filter((k) => k.startsWith(`${CACHE_PREFIX}tafsir.`)).length,
    };
  } catch {
    return { surah: 0, tafsir: 0 };
  }
}

export async function clearCache(): Promise<void> {
  memory.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(CACHE_PREFIX)));
  } catch {}
}
