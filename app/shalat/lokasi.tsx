import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getKabkotaList, getProvinsiList } from '@/api/client';
import { useResource } from '@/api/useResource';
import { tapFeedback } from '@/components/feedback';
import { useToast } from '@/components/toast';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  EmptyState,
  ErrorState,
  Loading,
  OfflineBanner,
  SearchField,
  SectionTitle,
} from '@/components/ui';
import { useIsOffline } from '@/offline/network';
import { useSettings } from '@/store/settings';
import { TAP_TARGET, radius, spacing, type as typeScale } from '@/theme';

export default function PilihLokasiScreen() {
  const router = useRouter();
  const { colors, settings, setSetting } = useSettings();
  const toast = useToast();
  const offline = useIsOffline();

  const [province, setProvince] = useState<string | undefined>();
  const [query, setQuery] = useState('');

  const provinces = useResource(getProvinsiList, []);

  const kabkotaLoader = useCallback(
    (force: boolean) => {
      if (!province) return Promise.reject(new Error('Provinsi belum dipilih.'));
      return getKabkotaList(province, force);
    },
    [province],
  );
  const kabkota = useResource(kabkotaLoader, [province ?? '']);

  const step = province === undefined ? 'provinsi' : 'kabkota';
  const source = step === 'provinsi' ? provinces : kabkota;
  const options = useMemo(() => {
    const list = source.data ?? [];
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return list;
    return list.filter((name) => name.toLowerCase().includes(trimmed));
  }, [source.data, query]);

  const choose = (name: string) => {
    tapFeedback();
    if (step === 'provinsi') {
      setProvince(name);
      setQuery('');
      return;
    }
    setSetting('shalatProvinsi', province ?? '');
    setSetting('shalatKabkota', name);
    toast.show(`Lokasi diatur ke ${name}`, { tone: 'success', icon: 'location' });
    router.back();
  };

  const shell = (children: ReactNode) => (
    <View style={styles.fill}>
      <ScreenHeader title="Pilih Lokasi" />
      {children}
    </View>
  );

  if (step === 'kabkota' && !province) return shell(null);
  if (source.loading && !source.data) return shell(<Loading label="Memuat daftar wilayah…" />);
  if (source.error && !source.data) {
    return shell(<ErrorState message={source.error} onRetry={source.reload} />);
  }

  return shell(
    <FlatList
        data={options}
        keyExtractor={(item) => item}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            {offline ? <OfflineBanner /> : null}

            <View style={styles.steps}>
              <StepChip
                index={1}
                label={province ?? 'Provinsi'}
                active={step === 'provinsi'}
                done={!!province}
                onPress={() => {
                  if (province) {
                    setProvince(undefined);
                    setQuery('');
                  }
                }}
              />
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              <StepChip index={2} label="Kab./Kota" active={step === 'kabkota'} done={false} />
            </View>

            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder={step === 'provinsi' ? 'Cari provinsi' : 'Cari kabupaten/kota'}
            />

            <SectionTitle style={styles.sectionTitle}>
              {step === 'provinsi' ? `${options.length} provinsi` : `${options.length} kabupaten/kota`}
            </SectionTitle>
          </View>
        }
        renderItem={({ item }) => {
          const selected =
            step === 'kabkota' && settings.shalatKabkota === item && settings.shalatProvinsi === province;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => choose(item)}
              android_ripple={{ color: colors.surfaceAlt }}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: pressed ? colors.surfaceAlt : colors.surface },
              ]}
            >
              <Text style={[styles.rowLabel, { color: colors.text }]}>{item}</Text>
              <Ionicons
                name={selected ? 'checkmark-circle' : 'chevron-forward'}
                size={selected ? 20 : 17}
                color={selected ? colors.primary : colors.textFaint}
              />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="Tidak ditemukan"
            message={`Tidak ada wilayah yang cocok dengan “${query}”.`}
          />
        }
      />,
  );
}

function StepChip({
  index,
  label,
  active,
  done,
  onPress,
}: {
  index: number;
  label: string;
  active: boolean;
  done: boolean;
  onPress?: () => void;
}) {
  const colors = useSettings().colors;
  const tint = active ? colors.primary : done ? colors.text : colors.textFaint;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.step,
        {
          backgroundColor: active ? colors.primarySoft : colors.surfaceAlt,
          opacity: pressed && onPress ? 0.7 : 1,
        },
      ]}
    >
      <View style={[styles.stepIndex, { backgroundColor: tint }]}>
        <Text style={[styles.stepIndexText, { color: colors.surface }]}>{index}</Text>
      </View>
      <Text numberOfLines={1} style={[styles.stepLabel, { color: tint }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  header: { gap: spacing.md },
  steps: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    flexShrink: 1,
  },
  stepIndex: { width: 22, height: 22, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  stepIndexText: { ...typeScale.label, fontWeight: '800' },
  stepLabel: { ...typeScale.caption, fontWeight: '600', flexShrink: 1 },
  sectionTitle: { paddingHorizontal: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: TAP_TARGET + 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  rowLabel: { ...typeScale.body, flex: 1 },
});
