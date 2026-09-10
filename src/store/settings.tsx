import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { DEFAULT_QARI, type PrayerKey, type QariId } from '@/api/types';
import { palettes, type ArabicFontKey, type Palette, type ThemeName } from '@/theme';

const STORAGE_KEY = 'equran.settings.v1';

export type ThemePreference = ThemeName | 'system';

export type Settings = {
  qari: QariId;
  arabicFontSize: number;
  arabicFont: ArabicFontKey;
  showLatin: boolean;
  showTranslation: boolean;
  themePreference: ThemePreference;
  autoplayNext: boolean;
  followPlayback: boolean;
  shalatProvinsi: string;
  shalatKabkota: string;
  adhanEnabled: boolean;
  adhanSound: AdhanSound;
  adhanPrayers: Record<PrayerKey, boolean>;
  onboarded: boolean;
};

export type AdhanSound = 'adhan' | 'default' | 'silent';

export const ARABIC_FONT_SIZE = { min: 20, max: 44, step: 2, default: 28 } as const;

const DEFAULTS: Settings = {
  qari: DEFAULT_QARI,
  arabicFontSize: ARABIC_FONT_SIZE.default,
  arabicFont: 'scheherazade',
  showLatin: true,
  showTranslation: true,
  themePreference: 'dark',
  autoplayNext: true,
  followPlayback: true,
  shalatProvinsi: '',
  shalatKabkota: '',
  adhanEnabled: false,
  adhanSound: 'adhan',
  adhanPrayers: { subuh: true, dzuhur: true, ashar: true, maghrib: true, isya: true },
  onboarded: false,
};

type SettingsContextValue = {
  settings: Settings;
  ready: boolean;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetSettings: () => void;
  theme: ThemeName;
  colors: Palette;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (active && raw) {
          const stored = JSON.parse(raw) as Partial<Settings>;
          setSettings({
            ...DEFAULTS,
            ...stored,
            adhanPrayers: { ...DEFAULTS.adhanPrayers, ...stored.adhanPrayers },
            themePreference: stored.themePreference ?? DEFAULTS.themePreference,
          });
        }
      } catch {} finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setSetting = useCallback<SettingsContextValue['setSetting']>(
    (key, value) => {
      setSettings((current) => {
        const next = { ...current, [key]: value };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  const resetSettings = useCallback(
    () => setSettings((current) => {
      const next = { ...DEFAULTS, onboarded: current.onboarded };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    }),
    [],
  );

  const theme: ThemeName =
    settings.themePreference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : settings.themePreference;

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, ready, setSetting, resetSettings, theme, colors: palettes[theme] }),
    [settings, ready, setSetting, resetSettings, theme],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside a SettingsProvider');
  return context;
}

export function useColors(): Palette {
  return useSettings().colors;
}
