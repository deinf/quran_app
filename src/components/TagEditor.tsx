import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui';
import { SUGGESTED_TAGS, type Bookmark } from '@/store/library';
import { useColors } from '@/store/settings';
import { TAP_TARGET, radius, spacing, type as typeScale } from '@/theme';

const MAX_TAG_LENGTH = 20;

export function TagEditor({
  bookmark,
  onClose,
  onSave,
}: {
  bookmark: Bookmark;
  onClose: () => void;
  onSave: (tags: string[]) => void;
}) {
  const colors = useColors();
  const [selected, setSelected] = useState<string[]>(bookmark.tags);
  const [draft, setDraft] = useState('');

  const toggle = (tag: string) =>
    setSelected((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );

  const addDraft = () => {
    const tag = draft.trim().slice(0, MAX_TAG_LENGTH);
    if (!tag) return;
    setSelected((current) => (current.includes(tag) ? current : [...current, tag]));
    setDraft('');
  };

  const options = [...SUGGESTED_TAGS, ...selected.filter((t) => !SUGGESTED_TAGS.includes(t as never))];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={[StyleSheet.absoluteFill, styles.scrim]}
          onPress={onClose}
          accessibilityLabel="Tutup"
        />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <View style={styles.head}>
          <Text style={[styles.title, { color: colors.text }]}>Label ayat</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Tutup" onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        <Text style={[styles.reference, { color: colors.textMuted }]}>
          {bookmark.surahName} : {bookmark.ayah}
        </Text>

        <View style={styles.tags}>
          {options.map((tag) => {
            const active = selected.includes(tag);
            return (
              <Pressable
                key={tag}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => toggle(tag)}
                style={[
                  styles.tag,
                  { backgroundColor: active ? colors.primary : colors.surfaceAlt },
                ]}
              >
                <Text style={[styles.tagText, { color: active ? colors.primaryText : colors.textMuted }]}>
                  {tag}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.inputRow, { backgroundColor: colors.surfaceAlt }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={addDraft}
            placeholder="Label sendiri"
            placeholderTextColor={colors.textFaint}
            maxLength={MAX_TAG_LENGTH}
            returnKeyType="done"
            style={[styles.input, { color: colors.text }]}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Tambah label" onPress={addDraft} hitSlop={8}>
            <Ionicons name="add-circle" size={24} color={colors.primary} />
          </Pressable>
        </View>

          <Button label="Simpan" icon="checkmark" onPress={() => onSave(selected)} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: typeScale.title,
  reference: { ...typeScale.caption, marginTop: -spacing.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  tagText: { ...typeScale.caption, fontWeight: '700' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: TAP_TARGET,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: typeScale.body.fontSize,
    fontWeight: typeScale.body.fontWeight,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
