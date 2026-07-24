import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { assistantApi, TRANSLATE_LANGUAGES } from '../../api/assistant';
import { Colors } from '../../theme/colors';
import { FontSize, FontWeight } from '../../theme/typography';
import { BorderRadius, Spacing } from '../../theme/spacing';
import { useHaptics } from '../../hooks/useHaptics';

interface Props {
  /** The content to translate (sermon notes, devotional message, etc.). */
  text: string;
  /** Light label shown on the translated card, e.g. "Sermon". */
  contentLabel?: string;
}

/**
 * TranslatePanel — a "🌍 Translate" control for any block of church content.
 * Tap it, pick a language (Twi/Ga/Ewe/French/English), and the AI translation
 * appears in a card below — the original above it is never touched.
 */
export function TranslatePanel({ text, contentLabel = 'this' }: Props) {
  const haptics = useHaptics();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: (target: string) => assistantApi.translate(text, target),
    onSuccess: (translated, target) => {
      haptics.success();
      setLang(target);
      setResult(translated);
    },
    onError: (err: any) => {
      haptics.error();
      Alert.alert('Could not translate', err?.friendlyMessage ?? 'Please try again.');
    },
  });

  if (!text || !text.trim()) return null;

  return (
    <View style={styles.wrap}>
      {!open && !result ? (
        <TouchableOpacity
          onPress={() => { haptics.light(); setOpen(true); }}
          style={styles.triggerBtn}
          accessibilityRole="button"
          accessibilityLabel={`Translate ${contentLabel} into another language`}
        >
          <Text style={styles.triggerText}>🌍 Translate</Text>
        </TouchableOpacity>
      ) : null}

      {open && !result && (
        <View style={styles.langRow}>
          <Text style={styles.pickLabel}>Translate into…</Text>
          <View style={styles.chips}>
            {TRANSLATE_LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l}
                onPress={() => { haptics.light(); mutate(l); }}
                disabled={isPending}
                style={styles.chip}
                accessibilityRole="button"
                accessibilityLabel={`Translate into ${l}`}
              >
                <Text style={styles.chipText}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {isPending && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={Colors.gold} />
          <Text style={styles.loadingText}>Translating…</Text>
        </View>
      )}

      {result && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultBadge}>🌍 {lang?.toUpperCase()}</Text>
            <TouchableOpacity
              onPress={() => { haptics.light(); setResult(null); setLang(null); setOpen(false); }}
              accessibilityRole="button"
              accessibilityLabel="Show the original"
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>Show original ✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.resultText}>{result}</Text>
          <TouchableOpacity
            onPress={() => { haptics.light(); setResult(null); setOpen(true); }}
            accessibilityRole="button"
            accessibilityLabel="Translate into a different language"
            style={styles.againBtn}
          >
            <Text style={styles.againText}>Try another language</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  triggerBtn: {
    alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center',
    paddingHorizontal: Spacing.md, borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: 'rgba(244,164,41,0.45)',
  },
  triggerText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.bold },
  langRow: { gap: Spacing.sm },
  pickLabel: { color: 'rgba(245,240,255,0.6)', fontSize: FontSize.caption, fontWeight: FontWeight.semiBold, letterSpacing: 0.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    minHeight: 40, justifyContent: 'center', paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: 'rgba(244,164,41,0.4)',
    backgroundColor: 'rgba(244,164,41,0.1)',
  },
  chipText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  loadingText: { color: Colors.gold, fontSize: FontSize.small },
  resultCard: {
    borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm,
    backgroundColor: 'rgba(30,19,64,0.6)', borderWidth: 1, borderColor: 'rgba(244,164,41,0.3)',
    borderTopColor: 'rgba(255,255,255,0.22)',
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultBadge: { color: Colors.gold, fontSize: FontSize.caption, fontWeight: FontWeight.bold, letterSpacing: 1 },
  closeBtn: { minHeight: 32, justifyContent: 'center' },
  closeText: { color: 'rgba(245,240,255,0.7)', fontSize: FontSize.caption, fontWeight: FontWeight.medium },
  resultText: { color: '#F5F0FF', fontSize: FontSize.body, lineHeight: FontSize.body * 1.6 },
  againBtn: { minHeight: 36, justifyContent: 'center' },
  againText: { color: Colors.gold, fontSize: FontSize.caption, fontWeight: FontWeight.semiBold },
});

export default TranslatePanel;
