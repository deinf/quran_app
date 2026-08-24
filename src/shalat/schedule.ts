import { PRAYER_LABEL, PRAYER_ORDER, type JadwalHarian, type PrayerKey } from '@/api/types';

export function isoToday(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function toMinutes(time: string): number | undefined {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return undefined;
  return hours * 60 + minutes;
}

export type NextPrayer = {
  key: PrayerKey;
  label: string;
  time: string;
  minutesAway: number;
  tomorrow: boolean;
};

export function findNextPrayer(
  day: JadwalHarian,
  now = new Date(),
  tomorrowSubuh?: string,
): NextPrayer | undefined {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const key of PRAYER_ORDER) {
    const at = toMinutes(day[key]);
    if (at === undefined) continue;
    if (at >= nowMinutes) {
      return {
        key,
        label: PRAYER_LABEL[key],
        time: day[key],
        minutesAway: at - nowMinutes,
        tomorrow: false,
      };
    }
  }

  const subuh = tomorrowSubuh ?? day.subuh;
  const at = toMinutes(subuh);
  if (at === undefined) return undefined;
  return {
    key: 'subuh',
    label: PRAYER_LABEL.subuh,
    time: subuh,
    minutesAway: 24 * 60 - nowMinutes + at,
    tomorrow: true,
  };
}

export function formatCountdown(minutes: number): string {
  if (minutes <= 0) return 'sebentar lagi';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} menit`;
  if (rest === 0) return `${hours} jam`;
  return `${hours} jam ${rest} menit`;
}

export const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export function formatLongDate(day: JadwalHarian): string {
  const parts = day.tanggal_lengkap.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  return `${day.hari}, ${day.tanggal} ${MONTH_NAMES[month - 1] ?? ''} ${year}`;
}
