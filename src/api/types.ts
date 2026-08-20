export type QariId = '01' | '02' | '03' | '04' | '05' | '06';

export type AudioMap = Record<QariId, string>;

export type SurahSummary = {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  tempatTurun: string;
  arti: string;
  deskripsi: string;
  audioFull: AudioMap;
};

export type Ayah = {
  nomorAyat: number;
  teksArab: string;
  teksLatin: string;
  teksIndonesia: string;
  audio: AudioMap;
};

export type SurahLink = Pick<SurahSummary, 'nomor' | 'nama' | 'namaLatin' | 'jumlahAyat'> | false;

export type SurahDetail = SurahSummary & {
  ayat: Ayah[];
  suratSelanjutnya: SurahLink;
  suratSebelumnya: SurahLink;
};

export type TafsirEntry = {
  ayat: number;
  teks: string;
};

export type TafsirDetail = SurahSummary & {
  tafsir: TafsirEntry[];
  suratSelanjutnya: SurahLink;
  suratSebelumnya: SurahLink;
};

export type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T;
};

export const QARI: { id: QariId; name: string; short: string }[] = [
  { id: '01', name: 'Abdullah Al-Juhany', short: 'Al-Juhany' },
  { id: '02', name: 'Abdul Muhsin Al-Qasim', short: 'Al-Qasim' },
  { id: '03', name: 'Abdurrahman As-Sudais', short: 'As-Sudais' },
  { id: '04', name: 'Ibrahim Al-Dossari', short: 'Al-Dossari' },
  { id: '05', name: 'Misyari Rasyid Al-Afasi', short: 'Al-Afasi' },
  { id: '06', name: 'Yasser Al-Dosari', short: 'Al-Dosari' },
];

export const DEFAULT_QARI: QariId = '01';

export function pickAudio(map: AudioMap | undefined, qari: QariId): string | undefined {
  if (!map) return undefined;
  return map[qari] ?? Object.values(map).find(Boolean);
}

export type Doa = {
  id: number;
  grup: string;
  nama: string;
  ar: string;
  tr: string;
  idn: string;
  tentang?: string;
  tag?: string;
};

export type JadwalHarian = {
  tanggal: number;
  tanggal_lengkap: string;
  hari: string;
  imsak: string;
  subuh: string;
  terbit: string;
  dhuha: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
};

export type JadwalShalat = {
  provinsi: string;
  kabkota: string;
  bulan: number;
  tahun: number;
  bulan_nama: string;
  jadwal: JadwalHarian[];
};

export const PRAYER_ORDER = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'] as const;

export type PrayerKey = (typeof PRAYER_ORDER)[number];

export const PRAYER_LABEL: Record<PrayerKey, string> = {
  subuh: 'Subuh',
  dzuhur: 'Dzuhur',
  ashar: 'Ashar',
  maghrib: 'Maghrib',
  isya: 'Isya',
};
