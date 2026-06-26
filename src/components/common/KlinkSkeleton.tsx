import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { BorderRadius } from '../../theme/spacing';
import { Duration } from '../../theme/animations';

interface Props {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function KlinkSkeleton({ width = '100%', height = 16, borderRadius = BorderRadius.sm, style }: Props) {
  const { theme, isDark } = useTheme();
  const shimmer = useSharedValue(-1);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: Duration.shimmer }),
      -1,
      false,
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [-1, 0, 1], [0.4, 1, 0.4]),
  }));

  return (
    <View
      style={[
        { width, height, borderRadius, overflow: 'hidden', backgroundColor: theme.skeleton },
        style,
      ]}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.skeletonShimmer }, shimmerStyle]}
      />
    </View>
  );
}

export function MemberCardSkeleton() {
  return (
    <View style={styles.memberCard}>
      <KlinkSkeleton width={52} height={52} borderRadius={26} />
      <View style={styles.memberInfo}>
        <KlinkSkeleton width="60%" height={14} />
        <View style={{ height: 6 }} />
        <KlinkSkeleton width="40%" height={11} />
      </View>
    </View>
  );
}

export function SermonCardSkeleton() {
  return (
    <View style={styles.sermonCard}>
      <KlinkSkeleton width="100%" height={160} borderRadius={12} />
      <View style={{ height: 10 }} />
      <KlinkSkeleton width="70%" height={14} />
      <View style={{ height: 6 }} />
      <KlinkSkeleton width="50%" height={11} />
      <View style={{ height: 6 }} />
      <KlinkSkeleton width="30%" height={11} />
    </View>
  );
}

export function AnnouncementSkeleton() {
  return (
    <View style={styles.announcement}>
      <KlinkSkeleton width="100%" height={20} />
      <View style={{ height: 8 }} />
      <KlinkSkeleton width="90%" height={14} />
      <View style={{ height: 4 }} />
      <KlinkSkeleton width="75%" height={14} />
    </View>
  );
}

export function StatCardSkeleton() {
  return (
    <View style={styles.statCard}>
      <KlinkSkeleton width={32} height={32} borderRadius={8} />
      <View style={{ height: 8 }} />
      <KlinkSkeleton width="80%" height={28} />
      <View style={{ height: 4 }} />
      <KlinkSkeleton width="60%" height={11} />
    </View>
  );
}

const styles = StyleSheet.create({
  memberCard: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  memberInfo: { flex: 1 },
  sermonCard: { padding: 16 },
  announcement: { padding: 16 },
  statCard: { padding: 16, alignItems: 'flex-start' },
});
