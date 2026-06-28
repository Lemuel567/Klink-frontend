import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStore } from '../../store/networkStore';
import { FontSize, FontWeight } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';

export function OfflineBanner() {
  const { isOffline } = useNetworkStore();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isOffline) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = withTiming(-80, { duration: 300 });
      opacity.value = withTiming(0, { duration: 250 });
    }
  }, [isOffline]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.wrapper, { paddingTop: insets.top + 4 }, animatedStyle]}
      pointerEvents="none"
    >
      <View style={styles.pill}>
        <Text style={styles.dot}>●</Text>
        <Text style={styles.text}>No internet connection</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#C0392B',
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: 20,
  },
  dot: {
    color: '#FF9080',
    fontSize: 8,
    lineHeight: 14,
  },
  text: {
    color: '#FFFFFF',
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semiBold,
    letterSpacing: 0.3,
  },
});
