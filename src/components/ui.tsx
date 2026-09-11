import { Ionicons } from '@expo/vector-icons';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { tapFeedback } from '@/components/feedback';
import { useColors } from '@/store/settings';
import { HAIRLINE, TAP_TARGET, motion, radius, spacing, type as typeScale } from '@/theme';

export function elevation(color: string, level: 1 | 2 | 3 = 1) {
  if (Platform.OS === 'android') {
    return { elevation: level * 2 };
  }
  return {
    shadowColor: color,
    shadowOpacity: 0.05 + level * 0.025,
    shadowRadius: level * 6,
    shadowOffset: { width: 0, height: level * 2 },
  };
}

export function hairline(color: string) {
  return { borderWidth: HAIRLINE, borderColor: color };
}

export function PressableCard({
  children,
  onPress,
  style,
  accessibilityLabel,
  haptic = true,
  disabled,
  containsControls = false,
}: {
  children: ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  haptic?: boolean;
  disabled?: boolean;
  containsControls?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const spring = useCallback(
    (to: number) => {
      Animated.timing(scale, {
        toValue: to,
        duration: to < 1 ? motion.fast : motion.base,
        easing: motion.emphasized,
        useNativeDriver: true,
      }).start();
    },
    [scale],
  );

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessible={!containsControls}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPressIn={() => spring(0.985)}
        onPressOut={() => spring(1)}
        onPress={() => {
          if (haptic) tapFeedback();
          onPress();
        }}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Loading({ label }: { label?: string }) {
  const colors = useColors();
  return (
    <View style={styles.centre}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Text style={[styles.caption, { color: colors.textMuted }]}>{label}</Text> : null}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <StateBlock icon="cloud-offline-outline" title="Gagal memuat" message={message}>
      {onRetry ? <Button label="Coba lagi" icon="refresh" onPress={onRetry} /> : null}
    </StateBlock>
  );
}

export function EmptyState({
  icon,
  title,
  message,
}: {
  icon: IconName;
  title: string;
  message: string;
}) {
  return <StateBlock icon={icon} title={title} message={message} />;
}

function StateBlock({
  icon,
  title,
  message,
  children,
}: {
  icon: IconName;
  title: string;
  message: string;
  children?: ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.centre}>
      <View style={[styles.stateIcon, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name={icon} size={28} color={colors.textMuted} />
      </View>
      <Text style={[styles.stateTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.caption, { color: colors.textMuted }]}>{message}</Text>
      {children ? <View style={styles.stateAction}>{children}</View> : null}
    </View>
  );
}

export function Button({
  label,
  icon,
  onPress,
  variant = 'primary',
  size = 'md',
  style,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  variant?: 'primary' | 'tonal' | 'subtle' | 'danger';
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const background =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.danger
        : variant === 'tonal'
          ? colors.primarySoft
          : colors.surfaceAlt;
  const foreground =
    variant === 'primary'
      ? colors.primaryText
      : variant === 'danger'
        ? '#FFFFFF'
        : variant === 'tonal'
          ? colors.onPrimarySoft
          : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' ? styles.buttonSm : null,
        { backgroundColor: background, opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={size === 'sm' ? 15 : 17} color={foreground} /> : null}
      <Text
        numberOfLines={1}
        style={[styles.buttonLabel, size === 'sm' ? styles.buttonLabelSm : null, { color: foreground }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  name,
  onPress,
  size = 22,
  color,
  disabled,
  label,
  style,
  haptic = true,
}: {
  name: IconName;
  onPress: () => void;
  size?: number;
  color?: string;
  disabled?: boolean;
  label: string;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={() => {
        if (haptic) tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        {
          opacity: disabled ? 0.3 : 1,
          backgroundColor: pressed && !disabled ? colors.surfaceAlt : 'transparent',
        },
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={color ?? colors.textMuted} />
    </Pressable>
  );
}

export function Chip({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' }) {
  const colors = useColors();
  const accent = tone === 'accent';
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: accent ? colors.primarySoft : colors.surfaceAlt },
      ]}
    >
      <Text style={[styles.chipLabel, { color: accent ? colors.onPrimarySoft : colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

export function SectionTitle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const colors = useColors();
  return <Text style={[styles.sectionTitle, { color: colors.textFaint }, style]}>{children}</Text>;
}

export function AyahBadge({ value, active }: { value: number; active?: boolean }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: active ? colors.primary : colors.primarySoft },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: active ? colors.primaryText : colors.onPrimarySoft },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export function ListGroup({
  title,
  footnote,
  children,
  style,
}: {
  title?: string;
  footnote?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const rows = Array.isArray(children) ? children.filter(Boolean) : [children];

  return (
    <View style={[styles.group, style]}>
      {title ? <SectionTitle style={styles.groupTitle}>{title}</SectionTitle> : null}
      <View style={[styles.groupBody, { backgroundColor: colors.surface }]}>
        {rows.map((row, index) => (
          <View key={index}>
            {index > 0 ? (
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            ) : null}
            {row}
          </View>
        ))}
      </View>
      {footnote ? (
        <Text style={[styles.groupFootnote, { color: colors.textFaint }]}>{footnote}</Text>
      ) : null}
    </View>
  );
}

export function Row({
  title,
  subtitle,
  icon,
  value,
  onPress,
  right,
  destructive,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
  accessibilityLabel?: string;
}) {
  const colors = useColors();
  const tint = destructive ? colors.danger : colors.text;

  const content = (
    <View style={styles.row}>
      {icon ? <Ionicons name={icon} size={19} color={destructive ? colors.danger : colors.textMuted} /> : null}
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: tint }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right ?? (
        <>
          {value ? <Text style={[styles.rowValue, { color: colors.textMuted }]}>{value}</Text> : null}
          {onPress ? <Ionicons name="chevron-forward" size={17} color={colors.textFaint} /> : null}
        </>
      )}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      android_ripple={{ color: colors.surfaceAlt }}
      style={({ pressed }) => (pressed ? { backgroundColor: colors.surfaceAlt } : undefined)}
    >
      {content}
    </Pressable>
  );
}

const MEASURE_WIDTH = 4000;

export function MarqueeText({
  children,
  style,
  speed = 32,
  gap = 28,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
  speed?: number;
  gap?: number;
}) {
  const [boxWidth, setBoxWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const offset = useRef(new Animated.Value(0)).current;

  const overflows = boxWidth > 0 && textWidth > boxWidth + 1 && !reduceMotion;

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    offset.setValue(0);
    if (!overflows) return;
    const distance = textWidth + gap;
    const animation = Animated.loop(
      Animated.timing(offset, {
        toValue: -distance,
        duration: (distance / speed) * 1000,
        delay: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [overflows, textWidth, gap, speed, offset]);

  return (
    <View
      style={[styles.marquee, overflows ? null : styles.marqueeIdle]}
      onLayout={(event) => setBoxWidth(event.nativeEvent.layout.width)}
    >
      <View style={styles.marqueeMeasure} pointerEvents="none">
        <Text
          style={style}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          onLayout={(event) => setTextWidth(event.nativeEvent.layout.width)}
        >
          {children}
        </Text>
      </View>

      <Animated.View style={[styles.marqueeTrack, { transform: [{ translateX: offset }] }]}>
        <Text numberOfLines={1} style={[style, overflows ? { width: textWidth } : null]}>
          {children}
        </Text>
        {overflows ? (
          <Text
            numberOfLines={1}
            style={[style, { width: textWidth, marginLeft: gap }]}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          >
            {children}
          </Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
  style,
  onSubmitEditing,
  returnKeyType = 'search',
}: {
  value: string;
  onChangeText: (next: string) => void;
  placeholder: string;
  style?: StyleProp<ViewStyle>;
  onSubmitEditing?: () => void;
  returnKeyType?: 'search' | 'go';
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.searchField,
        { backgroundColor: colors.surface },
        hairline(colors.border),
        style,
      ]}
    >
      <Ionicons name="search" size={18} color={colors.textFaint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        style={[styles.searchFieldInput, { color: colors.text }]}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hapus pencarian"
          onPress={() => onChangeText('')}
          hitSlop={10}
        >
          <Ionicons name="close-circle" size={18} color={colors.textFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function OfflineBanner() {
  const colors = useColors();
  return (
    <View style={[styles.banner, { backgroundColor: colors.accentSoft }]}>
      <Ionicons name="cloud-offline-outline" size={15} color={colors.textMuted} />
      <Text style={[styles.bannerText, { color: colors.textMuted }]}>
        Mode offline. Hanya surah yang tersimpan dapat dibuka.
      </Text>
    </View>
  );
}

export function ProgressBar({ value, total }: { value: number; total: number }) {
  const colors = useColors();
  const ratio = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
      <View
        style={[styles.fill, { backgroundColor: colors.primary, width: `${ratio * 100}%` }]}
      />
    </View>
  );
}

export function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  stateIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  stateTitle: { ...typeScale.title, marginTop: spacing.sm },
  caption: { ...typeScale.body, textAlign: 'center', maxWidth: 320 },
  stateAction: { marginTop: spacing.lg },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: TAP_TARGET,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  buttonSm: { minHeight: 36, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  buttonLabel: { ...typeScale.heading, fontWeight: '600' },
  buttonLabelSm: { ...typeScale.caption, fontWeight: '600' },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  chipLabel: typeScale.label,
  sectionTitle: { ...typeScale.label, textTransform: 'uppercase' },
  badge: {
    minWidth: 36,
    height: 34,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  group: { gap: spacing.sm },
  groupTitle: { paddingHorizontal: spacing.md },
  groupBody: { borderRadius: radius.xl, overflow: 'hidden' },

  groupFootnote: { ...typeScale.caption, paddingHorizontal: spacing.md, lineHeight: 18 },
  divider: { height: HAIRLINE, marginLeft: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TAP_TARGET,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: typeScale.heading,
  rowSubtitle: typeScale.caption,
  rowValue: typeScale.body,
  marquee: { flex: 1, overflow: 'hidden' },
  marqueeIdle: { alignItems: 'flex-end' },
  marqueeMeasure: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    width: MEASURE_WIDTH,
    opacity: 0,
  },
  marqueeTrack: { flexDirection: 'row', alignSelf: 'flex-start' },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: TAP_TARGET,
    borderRadius: radius.pill,
  },
  searchFieldInput: {
    flex: 1,
    height: '100%',
    fontSize: typeScale.body.fontSize,
    fontWeight: typeScale.body.fontWeight,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  bannerText: { ...typeScale.caption, flex: 1 },
  track: { height: 6, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
