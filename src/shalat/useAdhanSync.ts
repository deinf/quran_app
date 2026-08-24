import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getJadwalShalat } from '@/api/client';
import { useSettings } from '@/store/settings';

import { syncPrayerNotifications, type SyncResult } from './notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function useAdhanSync(): { lastResult: SyncResult | undefined; resync: () => void } {
  const { settings } = useSettings();
  const [lastResult, setLastResult] = useState<SyncResult>();
  const running = useRef(false);

  const { adhanEnabled, adhanSound, adhanPrayers, shalatProvinsi, shalatKabkota } = settings;

  const sync = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      const schedules = [];
      if (adhanEnabled && shalatProvinsi && shalatKabkota) {
        const now = new Date();
        const months = [
          { month: now.getMonth() + 1, year: now.getFullYear() },
          now.getMonth() === 11
            ? { month: 1, year: now.getFullYear() + 1 }
            : { month: now.getMonth() + 2, year: now.getFullYear() },
        ];
        for (const { month, year } of months) {
          try {
            const { data } = await getJadwalShalat(shalatProvinsi, shalatKabkota, month, year);
            schedules.push(data);
          } catch {}
        }
      }

      const result = await syncPrayerNotifications({
        schedules,
        enabled: adhanEnabled && !!shalatProvinsi && !!shalatKabkota,
        sound: adhanSound,
        prayers: adhanPrayers,
        place: shalatKabkota || 'lokasimu',
      });
      setLastResult(result);
    } catch {} finally {
      running.current = false;
    }
  }, [adhanEnabled, adhanSound, adhanPrayers, shalatProvinsi, shalatKabkota]);

  useEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => subscription.remove();
  }, [sync]);

  return { lastResult, resync: () => void sync() };
}
