import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

function safely(run: () => Promise<void>): void {
  if (!supported) return;
  try {
    run().catch(() => {});
  } catch {}
}

export function tapFeedback(): void {
  safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function pressFeedback(): void {
  safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function successFeedback(): void {
  safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function warnFeedback(): void {
  safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
