import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AudioProvider } from '@/audio/player';
import { OfflineAudioProvider } from '@/offline/audio';
import { useAdhanSync } from '@/shalat/useAdhanSync';
import { ToastProvider } from '@/components/toast';
import { LibraryProvider } from '@/store/library';
import { SettingsProvider, useSettings } from '@/store/settings';

SplashScreen.preventAutoHideAsync().catch(() => {});

SplashScreen.setOptions({ duration: 400, fade: true });

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'ScheherazadeNew-Regular': require('../assets/fonts/ScheherazadeNew-Regular.ttf'),
    'AmiriQuran-Regular': require('../assets/fonts/AmiriQuran-Regular.ttf'),
    'Amiri-Regular': require('../assets/fonts/Amiri-Regular.ttf'),
  });

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <LibraryProvider>
          <OfflineAudioProvider>
            <AudioProvider>
              <ToastProvider>
                <ThemedNavigator fontsReady={fontsLoaded || !!fontError} />
              </ToastProvider>
            </AudioProvider>
          </OfflineAudioProvider>
        </LibraryProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function ThemedNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { colors, theme, ready, settings } = useSettings();
  useAdhanSync();

  useEffect(() => {
    if (fontsReady && ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady, ready]);

  if (!fontsReady || !ready) return null;

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Protected guard={settings.onboarded}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Al-Qur’an' }} />
          <Stack.Screen name="surah/[nomor]" options={{ title: '' }} />
          <Stack.Screen name="tafsir/[nomor]" options={{ title: 'Tafsir' }} />
          <Stack.Screen name="history" options={{ title: 'Riwayat Bacaan' }} />
          <Stack.Screen name="share" options={{ title: 'Bagikan Ayat' }} />
          <Stack.Screen name="doa/index" options={{ title: 'Doa Harian' }} />
          <Stack.Screen name="doa/[id]" options={{ title: 'Doa' }} />
          <Stack.Screen name="shalat/index" options={{ title: 'Jadwal Shalat' }} />
          <Stack.Screen name="shalat/lokasi" options={{ title: 'Pilih Lokasi' }} />
          <Stack.Screen name="unduhan/index" options={{ title: 'Unduhan Offline' }} />
          <Stack.Screen name="unduhan/[nomor]" options={{ title: 'Unduh Audio' }} />
        </Stack.Protected>

        <Stack.Protected guard={!settings.onboarded}>
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
