import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, {
  cancelAnimation,
  useReducedMotion,
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSoundStore } from '../../store/soundStore';
import { soundManager } from '../../utils/soundManager';
import { Colors } from '../../theme/colors';
import { FontSize, FontWeight } from '../../theme/typography';

export function MusicIndicator() {
  const { musicEnabled } = useSoundStore();
  const opacity = useSharedValue(0);
  const noteScale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  // Track which song is playing so the label updates when songs switch
  const [trackIndex, setTrackIndex] = useState(soundManager.getCurrentTrackIndex());
  const total = soundManager.getTotalTracks();

  // Subscribe to track changes from soundManager
  useEffect(() => {
    const unsubscribe = soundManager.onTrackChange((index) => setTrackIndex(index));
    return unsubscribe;
  }, []);

  useEffect(() => {
    opacity.value = withTiming(musicEnabled ? 1 : 0, { duration: 400 });
    // The pulse is decorative — respect reduce-motion (this pill is mounted
    // over EVERY screen, so an ungated infinite loop is always running).
    if (musicEnabled && !reducedMotion) {
      noteScale.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 700 }),
          withTiming(0.95, { duration: 700 }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(noteScale);
      noteScale.value = withTiming(1, { duration: 200 });
    }
    return () => cancelAnimation(noteScale);
  }, [musicEnabled, reducedMotion]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const noteStyle = useAnimatedStyle(() => ({
    transform: [{ scale: noteScale.value }],
  }));

  return (
    <Animated.View
      style={[styles.wrapper, containerStyle]}
      pointerEvents={musicEnabled ? 'auto' : 'none'}
    >
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/profile')}
        style={styles.pill}
        accessibilityLabel={`Worship music playing — song ${trackIndex + 1} of ${total} — tap to manage`}
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Animated.Text style={[styles.note, noteStyle]}>♪</Animated.Text>
        <Text style={styles.label}>{trackIndex + 1} of {total}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 90,
    right: 16,
    zIndex: 999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(45,27,105,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.6)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  note: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  label: {
    color: Colors.white,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semiBold,
  },
});
