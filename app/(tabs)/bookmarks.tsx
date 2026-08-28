import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { SavedAyahCard } from '@/components/SavedAyahCard';
import { TagEditor } from '@/components/TagEditor';
import {
  CollapsingAppBar,
  useCollapsingScroll,
  useFoldedTitleOpacity,
} from '@/components/CollapsingAppBar';
import { EmptyState, Loading } from '@/components/ui';
import { useLibrary, type Bookmark } from '@/store/library';
import { useColors } from '@/store/settings';
import { SERIF, radius, spacing, type as typeScale } from '@/theme';

type TagFilter = string | undefined;

const EXPANDED = 176;

export default function SavedScreen() {
  const colors = useColors();
  const router = useRouter();
  const { bookmarks, ready, removeBookmark, clearBookmarks, setBookmarkTags } = useLibrary();
  const [editing, setEditing] = useState<Bookmark | undefined>();
  const [filter, setFilter] = useState<TagFilter>();

  const { scrollY, onScroll, folded } = useCollapsingScroll(EXPANDED, { trackFolded: true });
  const titleOpacity = useFoldedTitleOpacity(scrollY, EXPANDED);

  const allTags = useMemo(() => {
    const seen = new Set<string>();
    bookmarks.forEach((b) => b.tags.forEach((t) => seen.add(t)));
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [bookmarks]);

  const visible = useMemo(
    () => (filter ? bookmarks.filter((b) => b.tags.includes(filter)) : bookmarks),
    [bookmarks, filter],
  );

  const clearAll = () =>
    Alert.alert('Hapus semua ayat tersimpan?', 'Tindakan ini tidak dapat dibatalkan.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: clearBookmarks },
    ]);

  const header = (
    <CollapsingAppBar
      scrollY={scrollY}
      expanded={EXPANDED}
      folded={folded}
      squareWhenFolded
      silhouetteScale={0.7}
      silhouetteOpacity={0.05}
      body={
        <View style={styles.heroText}>
          <Text style={[styles.heroTitle, { color: colors.onHero }]}>Tersimpan</Text>
          <Text style={[styles.heroMeta, { color: colors.onHeroFaint }]}>
            {bookmarks.length ? `${bookmarks.length} ayat disimpan` : 'Belum ada ayat'}
          </Text>
        </View>
      }
      bar={
        <>
          <Animated.Text
            numberOfLines={1}
            style={[styles.barTitle, { color: colors.onHero, opacity: titleOpacity }]}
          >
            Tersimpan
          </Animated.Text>
          {bookmarks.length ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hapus semua ayat tersimpan"
              hitSlop={10}
              onPress={clearAll}
              style={({ pressed }) => [styles.barAction, { opacity: pressed ? 0.45 : 1 }]}
            >
              <Ionicons name="trash-outline" size={21} color={colors.onHero} />
            </Pressable>
          ) : null}
        </>
      }
    />
  );

  const shell = (children: ReactNode) => (
    <View style={styles.fill}>
      {header}
      {children}
    </View>
  );

  if (!ready) return shell(<Loading />);

  if (!bookmarks.length) {
    return shell(
      <EmptyState
        icon="bookmark-outline"
        title="Belum ada ayat tersimpan"
        message="Ketuk ikon penanda pada sebuah ayat untuk menyimpannya di sini."
      />,
    );
  }

  return shell(
    <>
      <Animated.FlatList
        data={visible}
        keyExtractor={(item) => `${item.surah}:${item.ayah}`}
        contentContainerStyle={styles.listContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          allTags.length ? (
            <View style={styles.filters}>
              <FilterChip label="Semua" active={!filter} onPress={() => setFilter(undefined)} />
              {allTags.map((tag) => (
                <FilterChip
                  key={tag}
                  label={tag}
                  active={filter === tag}
                  onPress={() => setFilter(filter === tag ? undefined : tag)}
                />
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <SavedAyahCard
            bookmark={item}
            onOpen={() => router.push(`/surah/${item.surah}?ayah=${item.ayah}`)}
            onRemove={() => removeBookmark(item.surah, item.ayah)}
            onEditTags={() => setEditing(item)}
            onShare={() => router.push(`/share?surah=${item.surah}&ayah=${item.ayah}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="pricetag-outline"
            title="Tidak ada yang berlabel ini"
            message={`Belum ada ayat tersimpan dengan label “${filter}”.`}
          />
        }
      />

      {editing ? (
        <TagEditor
          key={`${editing.surah}:${editing.ayah}`}
          bookmark={editing}
          onClose={() => setEditing(undefined)}
          onSave={(tags) => {
            setBookmarkTags(editing.surah, editing.ayah, tags);
            setEditing(undefined);
          }}
        />
      ) : null}
    </>,
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: active ? colors.primary : 'transparent',
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={[styles.filterLabel, { color: active ? colors.primaryText : colors.textMuted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  listContent: {
    paddingTop: EXPANDED + spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  heroText: { alignItems: 'center', gap: 2 },
  heroTitle: { ...typeScale.display, fontFamily: SERIF },
  heroMeta: typeScale.caption,
  barTitle: { ...typeScale.heading, fontSize: 17, flex: 1, textAlign: 'left', marginLeft: spacing.sm },
  barAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterLabel: { ...typeScale.caption, fontWeight: '700' },
});
