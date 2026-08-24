import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { PRAYER_LABEL, PRAYER_ORDER, type JadwalShalat, type PrayerKey } from '@/api/types';
import type { AdhanSound } from '@/store/settings';

const KIND = 'adhan';

const CHANNEL_VERSION = 'v2';

const CHANNELS: Record<AdhanSound, string> = {
  adhan: `adhan-call-${CHANNEL_VERSION}`,
  default: `adhan-default-${CHANNEL_VERSION}`,
  silent: `adhan-silent-${CHANNEL_VERSION}`,
};

const LEGACY_CHANNELS = ['adhan-call', 'adhan-default', 'adhan-silent'];

const ADHAN_SOUND_FILE = 'adhan.wav';

const DAYS_AHEAD = 7;

export type PermissionOutcome = 'granted' | 'denied';

export async function requestNotificationPermission(): Promise<PermissionOutcome> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return 'granted';
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted ? 'granted' : 'denied';
}

async function ensureChannel(sound: AdhanSound): Promise<string | undefined> {
  if (Platform.OS !== 'android') return undefined;

  const channelId = CHANNELS[sound];

  await Promise.all(
    [...LEGACY_CHANNELS, ...Object.values(CHANNELS).filter((id) => id !== channelId)].map((id) =>
      Notifications.deleteNotificationChannelAsync(id).catch(() => {}),
    ),
  );
  await Notifications.setNotificationChannelAsync(channelId, {
    name:
      sound === 'adhan'
        ? 'Adzan'
        : sound === 'default'
          ? 'Waktu shalat'
          : 'Waktu shalat (senyap)',
    importance: Notifications.AndroidImportance.HIGH,
    sound: sound === 'adhan' ? ADHAN_SOUND_FILE : sound === 'default' ? undefined : null,
    vibrationPattern: sound === 'silent' ? undefined : [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  return channelId;
}

export async function cancelPrayerNotifications(): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((item) => (item.content.data as { kind?: string } | undefined)?.kind === KIND)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

function toDate(isoDate: string, time: string): Date | undefined {
  const dateParts = isoDate.split('-').map(Number);
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (dateParts.length !== 3 || dateParts.some(Number.isNaN) || !timeMatch) return undefined;
  return new Date(
    dateParts[0],
    dateParts[1] - 1,
    dateParts[2],
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    0,
    0,
  );
}

export type SyncResult = {
  scheduled: number;
  reason?: 'permission' | 'no-schedule';
};

export async function syncPrayerNotifications(options: {
  schedules: JadwalShalat[];
  enabled: boolean;
  sound: AdhanSound;
  prayers: Record<PrayerKey, boolean>;
  place: string;
}): Promise<SyncResult> {
  const { schedules, enabled, sound, prayers, place } = options;

  await cancelPrayerNotifications();
  if (!enabled) return { scheduled: 0 };

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return { scheduled: 0, reason: 'permission' };

  if (!schedules.length) return { scheduled: 0, reason: 'no-schedule' };

  const channelId = await ensureChannel(sound);
  const now = Date.now();
  const horizon = now + DAYS_AHEAD * 24 * 60 * 60 * 1000;

  const days = schedules.flatMap((month) => month.jadwal);

  let scheduled = 0;
  for (const day of days) {
    for (const key of PRAYER_ORDER) {
      if (!prayers[key]) continue;
      const when = toDate(day.tanggal_lengkap, day[key]);
      if (!when || when.getTime() <= now || when.getTime() > horizon) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Waktu ${PRAYER_LABEL[key]}`,
          body: `Telah masuk waktu ${PRAYER_LABEL[key]} untuk ${place}.`,
          data: { kind: KIND, prayer: key, date: day.tanggal_lengkap },
          sound: sound === 'adhan' ? ADHAN_SOUND_FILE : sound === 'default' ? 'default' : undefined,
          ...(Platform.OS === 'android' ? {} : { interruptionLevel: 'timeSensitive' as const }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: when,
          ...(channelId ? { channelId } : {}),
        },
      });
      scheduled += 1;
    }
  }

  return { scheduled };
}

export async function countPrayerNotifications(): Promise<number> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  return pending.filter(
    (item) => (item.content.data as { kind?: string } | undefined)?.kind === KIND,
  ).length;
}
