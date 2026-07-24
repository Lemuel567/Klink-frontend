import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { assistantApi } from '../../api/assistant';
import { Colors } from '../../theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../theme/typography';
import { BorderRadius, Spacing } from '../../theme/spacing';
import { useHaptics } from '../../hooks/useHaptics';

interface Props {
  title: string;
  scripture?: string;
  memoryVerse?: string;
  notes: string;
}

/**
 * DiscussionGuidePanel — a "💬 Discussion guide" button for a sermon. Generates
 * a short small-group study guide (summary + reflection questions + prayer
 * point) from the sermon's notes, for members to use during the week.
 */
export function DiscussionGuidePanel({ title, scripture, memoryVerse, notes }: Props) {
  const haptics = useHaptics();
  const [guide, setGuide] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => assistantApi.discussionGuide({ title, scripture, memoryVerse, notes }),
    onSuccess: (result) => { haptics.success(); setGuide(result); },
    onError: (err: any) => {
      haptics.error();
      Alert.alert('Could not build the guide', err?.friendlyMessage ?? 'Please try again.');
    },
  });

  if (!notes || !notes.trim()) return null;

  return (
    <View style={styles.wrap}>
      {!guide && (
        <TouchableOpacity
          onPress={() => { haptics.light(); mutate(); }}
          disabled={isPending}
          style={styles.triggerBtn}
          accessibilityRole="button"
          accessibilityLabel="Generate a small-group discussion guide"
        >
          {isPending ? (
            <>
              <ActivityIndicator size="small" color={Colors.gold} />
              <Text style={styles.triggerText}>Building your guide…</Text>
            </>
          ) : (
            <Text style={styles.triggerText}>💬 Discussion guide</Text>
          )}
        </TouchableOpacity>
      )}

      {guide && (
        <View style={styles.card}>
          <Text style={styles.badge}>💬 SMALL-GROUP GUIDE</Text>
          <Text style={styles.text}>{guide}</Text>
          <TouchableOpacity
            onPress={() => { haptics.light(); setGuide(null); }}
            accessibilityRole="button"
            accessibilityLabel="Hide the discussion guide"
            style={styles.hideBtn}
          >
            <Text style={styles.hideText}>Hide guide</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  triggerBtn: {
    alignSelf: 'flex-start', minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    justifyContent: 'center', paddingHorizontal: Spacing.md, borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: 'rgba(244,164,41,0.45)',
  },
  triggerText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.bold },
  card: {
    borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm,
    backgroundColor: 'rgba(30,19,64,0.6)', borderWidth: 1, borderColor: 'rgba(244,164,41,0.3)',
    borderTopColor: 'rgba(255,255,255,0.22)',
  },
  badge: { color: Colors.gold, fontSize: FontSize.caption, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.wide },
  text: { color: '#F5F0FF', fontSize: FontSize.body, lineHeight: FontSize.body * 1.6 },
  hideBtn: { minHeight: 36, justifyContent: 'center' },
  hideText: { color: Colors.gold, fontSize: FontSize.caption, fontWeight: FontWeight.semiBold },
});

export default DiscussionGuidePanel;
