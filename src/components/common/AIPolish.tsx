import React from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import { assistantApi } from '../../api/assistant';
import { Colors } from '../../theme/colors';
import { FontSize, FontWeight } from '../../theme/typography';
import { BorderRadius, Spacing } from '../../theme/spacing';
import { useHaptics } from '../../hooks/useHaptics';

interface Props {
  /** Current field value to polish. */
  text: string;
  /** Called with the AI-polished replacement. Wire to your field's setter. */
  onResult: (polished: string) => void;
  /** What the text is, e.g. "an event description" — shapes the AI's tone. */
  contentType: string;
  /** Minimum characters before the button is usable (default 8). */
  minChars?: number;
  /** Button label (default "Polish with AI"). */
  label?: string;
  style?: ViewStyle;
}

/**
 * AIPolish — drop-in "✨ Polish with AI" button for any compose field.
 *
 * Takes the member's rough sentences and rewrites them into a clearer, fuller
 * version (grounded — never invents facts), then hands the result back via
 * onResult so the parent replaces the field. Shows a review badge afterwards
 * that clears itself once the member edits the text again.
 *
 * Usage:
 *   <AIPolish text={description} onResult={setDescription}
 *             contentType="an event description" />
 */
export function AIPolish({ text, onResult, contentType, minChars = 8, label = 'Polish with AI', style }: Props) {
  const haptics = useHaptics();
  // Remember what we last produced; the badge shows only while the field still
  // holds that exact text (i.e. the member hasn't edited it since).
  const [polished, setPolished] = React.useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => assistantApi.polish(text.trim(), contentType),
    onSuccess: (result) => {
      haptics.success();
      setPolished(result);
      onResult(result);
    },
    onError: (err: any) => {
      haptics.error();
      Alert.alert('Could not polish', err?.friendlyMessage ?? 'Please try again.');
    },
  });

  const ready = text.trim().length >= minChars;
  const showBadge = polished !== null && polished === text;

  return (
    <View style={style}>
      <TouchableOpacity
        onPress={() => { if (ready && !isPending) { haptics.light(); mutate(); } }}
        disabled={!ready || isPending}
        style={[styles.button, (!ready || isPending) && styles.buttonDisabled]}
        accessibilityRole="button"
        accessibilityLabel={showBadge ? 'Polish again with AI' : 'Polish this text with AI'}
        accessibilityState={{ disabled: !ready || isPending }}
      >
        <LinearGradient
          colors={['rgba(244,164,41,0.28)', 'rgba(107,63,160,0.35)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.inner}
        >
          {isPending ? (
            <>
              <ActivityIndicator size="small" color={Colors.gold} />
              <Text style={styles.label}>Polishing…</Text>
            </>
          ) : (
            <>
              <Text style={styles.sparkle}>✨</Text>
              <Text style={styles.label}>{showBadge ? 'Polish again' : label}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {showBadge && (
        <View style={styles.hintRow}>
          <Text style={styles.hintBadge}>AI POLISHED</Text>
          <Text style={styles.hint}>Review and edit before saving — it only uses what you wrote.</Text>
        </View>
      )}
      {!ready && !showBadge && (
        <Text style={styles.helper}>Type a few words, then let AI polish them.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.45)',
    marginTop: 2,
  },
  buttonDisabled: { opacity: 0.5 },
  inner: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  sparkle: { fontSize: 14 },
  label: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.bold, letterSpacing: 0.4 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 6 },
  hintBadge: {
    color: '#1A0533',
    backgroundColor: Colors.gold,
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  hint: { flex: 1, color: 'rgba(244,164,41,0.85)', fontSize: FontSize.caption },
  helper: { color: 'rgba(255,255,255,0.4)', fontSize: FontSize.caption, marginTop: 6 },
});

export default AIPolish;
