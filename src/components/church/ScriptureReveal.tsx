import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../../theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Duration, EasingPresets } from '../../theme/animations';
import { useHaptics } from '../../hooks/useHaptics';

interface Props {
  verse: string;
  reference: string;
  style?: ViewStyle;
}

export function ScriptureReveal({ verse, reference, style }: Props) {
  const haptics = useHaptics();
  const [copied, setCopied] = useState(false);

  const verseX = useSharedValue(40);
  const verseOpacity = useSharedValue(0);
  const refOpacity = useSharedValue(0);
  const borderH = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  const rippleScale = useSharedValue(0);

  useEffect(() => {
    borderH.value = withTiming(1, { duration: Duration.medium, easing: EasingPresets.enter });
    verseX.value = withDelay(200, withTiming(0, { duration: Duration.medium, easing: EasingPresets.enter }));
    verseOpacity.value = withDelay(200, withTiming(1, { duration: Duration.medium }));
    refOpacity.value = withDelay(500, withTiming(1, { duration: Duration.normal }));
  }, [verse]);

  const verseStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: verseX.value }],
    opacity: verseOpacity.value,
  }));

  const refStyle = useAnimatedStyle(() => ({ opacity: refOpacity.value }));

  const borderStyle = useAnimatedStyle(() => ({
    height: `${borderH.value * 100}%`,
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: rippleOpacity.value,
    transform: [{ scale: rippleScale.value }],
  }));

  const handleCopy = async () => {
    haptics.light();
    await Clipboard.setStringAsync(`${verse} — ${reference}`);
    setCopied(true);
    rippleOpacity.value = withTiming(0.6, { duration: 100 });
    rippleScale.value = withTiming(2, { duration: 400, easing: EasingPresets.enter });
    setTimeout(() => {
      rippleOpacity.value = withTiming(0, { duration: 300 });
      rippleScale.value = withTiming(0, { duration: 0 });
      setCopied(false);
    }, 1500);
  };

  return (
    <TouchableOpacity
      onPress={handleCopy}
      activeOpacity={0.85}
      style={[styles.container, style]}
      accessibilityLabel={`${verse} ${reference}. Tap to copy.`}
    >
      {/* Gold left border that draws downward */}
      <View style={styles.borderTrack}>
        <Animated.View style={[styles.border, borderStyle]} />
      </View>

      <View style={styles.content}>
        <Animated.Text style={[styles.verse, verseStyle]}>{verse}</Animated.Text>
        <Animated.Text style={[styles.reference, refStyle]}>{reference}</Animated.Text>
        {copied && <Text style={styles.copied}>Copied!</Text>}
      </View>

      {/* Ripple overlay on copy */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.ripple, rippleStyle]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  borderTrack: {
    width: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(244,164,41,0.2)',
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  border: {
    width: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 2,
  },
  content: { flex: 1, gap: 6 },
  verse: {
    color: Colors.darkText,
    fontSize: FontSize.body,
    fontStyle: 'italic',
    lineHeight: FontSize.body * 1.7,
  },
  reference: {
    color: Colors.gold,
    fontSize: FontSize.small,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wide,
  },
  copied: {
    color: Colors.green,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
  ripple: {
    borderRadius: 99,
    backgroundColor: Colors.gold,
    alignSelf: 'center',
  },
});
