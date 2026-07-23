import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { TypewriterText } from '../animations/TypewriterText';
import { Colors } from '../../theme/colors';
import { FontFamily, FontSize, FontWeight, LetterSpacing } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Duration, EasingPresets } from '../../theme/animations';
import { useHaptics } from '../../hooks/useHaptics';

interface Props {
  verse: string;
  reference: string;
  style?: ViewStyle;
}

/**
 * VerseReveal — the daily verse, editorial and alive.
 *
 * The quiet form of the original ScriptureReveal (gold border, quote,
 * reference) with three elevated touches, per the Klink design language
 * (one bold element, everything else restrained):
 *
 *   · an oversized ghost Playfair quotation mark behind the text
 *   · the verse WRITES ITSELF in serif italic — and re-writes on every
 *     visit to the screen, not just app launch
 *   · the gold border draws down in step with the writing; the reference
 *     and its rule surface only when the last word lands
 *
 * Tap to copy. Reduce-motion renders everything instantly.
 */
export function VerseReveal({ verse, reference, style }: Props) {
  const haptics = useHaptics();
  const [copied, setCopied] = useState(false);

  const borderH = useSharedValue(0);
  const refReveal = useSharedValue(0);

  const borderStyle = useAnimatedStyle(() => ({ height: `${borderH.value * 100}%` }));
  const refStyle = useAnimatedStyle(() => ({
    opacity: refReveal.value,
    transform: [{ translateY: (1 - refReveal.value) * 8 }],
  }));

  const handleCopy = async () => {
    haptics.light();
    await Clipboard.setStringAsync(`${verse} — ${reference}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <TouchableOpacity
      onPress={handleCopy}
      activeOpacity={0.85}
      style={[styles.container, style]}
      accessibilityRole="button"
      accessibilityLabel={`${verse} ${reference}. Tap to copy.`}
    >
      {/* Gold left border that draws downward while the verse writes */}
      <View style={styles.borderTrack}>
        <Animated.View style={[styles.border, borderStyle]} />
      </View>

      <View style={styles.content}>
        {/* Oversized ghost quotation mark — Playfair, barely-there gold */}
        <Text style={styles.ghostQuote} accessible={false} pointerEvents="none">
          {'“'}
        </Text>

        <TypewriterText
          text={verse}
          style={styles.verse}
          charDelayMs={26}
          maxDurationMs={3800}
          onStart={() => {
            refReveal.value = 0;
            borderH.value = 0;
            borderH.value = withTiming(1, { duration: 3800, easing: EasingPresets.enter });
          }}
          onDone={() => {
            borderH.value = withTiming(1, { duration: Duration.normal });
            refReveal.value = withTiming(1, { duration: 600 });
          }}
        />

        <Animated.View style={[styles.refRow, refStyle]}>
          <View style={styles.refRule} />
          <Text style={styles.reference}>{reference}</Text>
          {copied && <Text style={styles.copied}>Copied!</Text>}
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.md,
    position: 'relative',
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
  content: { flex: 1, gap: Spacing.sm, position: 'relative' },
  ghostQuote: {
    position: 'absolute',
    top: -26,
    left: -8,
    fontFamily: FontFamily.displayBold,
    fontSize: 96,
    lineHeight: 96,
    color: 'rgba(244,164,41,0.14)',
  },
  verse: {
    fontFamily: FontFamily.displayItalic,
    color: Colors.darkText,
    fontSize: FontSize.body + 2,
    lineHeight: (FontSize.body + 2) * 1.65,
  },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  refRule: { width: 28, height: 1.5, backgroundColor: Colors.gold, borderRadius: 1 },
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
  },
});

export default VerseReveal;
