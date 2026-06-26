import * as Haptics from 'expo-haptics';

export const useHaptics = () => ({
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  tab: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  select: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  delete: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  give: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  checkIn: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  prayer: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
});
