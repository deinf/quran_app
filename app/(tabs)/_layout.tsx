import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar, Tabs } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';

import { MiniPlayer } from '@/components/MiniPlayer';
import { useColors } from '@/store/settings';
import { radius, type as typeScale } from '@/theme';

type TabGlyph = 'home' | 'book' | 'bookmark' | 'settings';

function TabIcon({ base, focused }: { base: TabGlyph; focused: boolean }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.indicator,
        { backgroundColor: focused ? colors.primarySoft : 'transparent' },
      ]}
    >
      <Ionicons
        name={focused ? base : `${base}-outline`}
        size={22}
        color={focused ? colors.onPrimarySoft : colors.textFaint}
      />
    </View>
  );
}

function tabIcon(base: TabGlyph) {
  return ({ focused }: { focused: boolean }) => <TabIcon base={base} focused={focused} />;
}

export default function TabsLayout() {
  const colors = useColors();

  return (
    <Tabs
      tabBar={(props) => (
        <View
          style={[
            styles.dock,
            { backgroundColor: colors.surface, borderTopColor: colors.divider },
          ]}
        >
          <MiniPlayer />
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { ...typeScale.label, fontSize: 10.5, letterSpacing: 0 },
        tabBarItemStyle: { paddingVertical: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarLabel: 'Beranda',
          tabBarIcon: tabIcon('home'),
        }}
      />
      <Tabs.Screen
        name="surah-list"
        options={{
          title: 'Daftar Surah',
          tabBarLabel: 'Surah',
          tabBarIcon: tabIcon('book'),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: 'Tersimpan',
          tabBarLabel: 'Tersimpan',
          tabBarIcon: tabIcon('bookmark'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Pengaturan',
          tabBarLabel: 'Pengaturan',
          tabBarIcon: tabIcon('settings'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dock: { justifyContent: 'flex-end', borderTopWidth: StyleSheet.hairlineWidth },
  indicator: {
    width: 52,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
