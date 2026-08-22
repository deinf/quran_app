import { Ionicons } from '@expo/vector-icons';
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type IconName } from '@/components/ui';
import { useColors } from '@/store/settings';
import { radius, spacing, type as typeScale } from '@/theme';

const VISIBLE_MS = 2200;

export type ToastTone = 'neutral' | 'success' | 'danger';

type Toast = {
  seq: number;
  message: string;
  icon: IconName;
  tone: ToastTone;
};

type ToastContextValue = {
  show: (message: string, options?: { icon?: IconName; tone?: ToastTone }) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TONE_ICON: Record<ToastTone, IconName> = {
  neutral: 'information-circle',
  success: 'checkmark-circle',
  danger: 'trash',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | undefined>();
  const seq = useRef(0);

  const show = useCallback<ToastContextValue['show']>((message, options) => {
    seq.current += 1;
    const tone = options?.tone ?? 'neutral';
    setToast({ seq: seq.current, message, icon: options?.icon ?? TONE_ICON[tone], tone });
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost toast={toast} onHidden={() => setToast(undefined)} />
    </ToastContext.Provider>
  );
}

const ToastHost = memo(function ToastHost({
  toast,
  onHidden,
}: {
  toast: Toast | undefined;
  onHidden: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;
    let cancelled = false;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(progress, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        if (!cancelled) onHidden();
      });
    }, VISIBLE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.seq]);

  if (!toast) return null;

  const accent =
    toast.tone === 'success' ? colors.primary : toast.tone === 'danger' ? colors.danger : colors.text;

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessible
      accessibilityLabel={toast.message}
      style={[
        styles.wrap,
        { bottom: insets.bottom + 96 },
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
          ],
        },
      ]}
    >
      <View
        style={[styles.pill, { backgroundColor: colors.text }]}
      >
        <Ionicons name={toast.icon} size={18} color={accent} />
        <Text numberOfLines={2} style={[styles.text, { color: colors.text }]}>
          {toast.message}
        </Text>
      </View>
    </Animated.View>
  );
});

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside a ToastProvider');
  return context;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    pointerEvents: 'none',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: '100%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
  },
  text: { ...typeScale.caption, fontWeight: '700', flexShrink: 1 },
});
