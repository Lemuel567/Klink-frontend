import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScriptureReveal } from '../../src/components/church/ScriptureReveal';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { sermonsApi } from '../../src/api/sermons';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { formatDate } from '../../src/utils/formatters';

export default function SermonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const { data: sermon, isLoading } = useQuery({
    queryKey: ['sermon', id],
    queryFn: () => sermonsApi.list({ size: 100 }).then((r) => r.content.find((s) => s.id === id)),
    enabled: !!id,
  });

  if (!sermon && !isLoading) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero */}
        <LinearGradient
          colors={Gradients.worship}
          style={[styles.hero, { paddingTop: insets.top + 16 }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessibilityRole="button">
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.sermonTitle}>{sermon?.title ?? ''}</Text>
          <Text style={styles.preacher}>{sermon?.preacher}</Text>
          <Text style={styles.date}>{sermon?.sermonDate ? formatDate(sermon.sermonDate) : ''}</Text>
        </LinearGradient>

        <View style={styles.content}>
          {sermon?.scripture && (
            <ScrollReveal delay={0}>
              <Text style={[styles.sectionLabel, { color: Colors.gold }]}>SCRIPTURE</Text>
              <ScriptureReveal
                verse={sermon.memoryVerse ?? 'Read the full passage in your Bible.'}
                reference={sermon.scripture}
              />
            </ScrollReveal>
          )}

          {sermon?.notes && (
            <ScrollReveal delay={100}>
              <Text style={[styles.sectionLabel, { color: Colors.gold }]}>SERMON NOTES</Text>
              <Text style={[styles.notes, { color: theme.textSecondary }]}>{sermon.notes}</Text>
            </ScrollReveal>
          )}

          {sermon?.audioUrl && (
            <ScrollReveal delay={200}>
              <TouchableOpacity style={styles.playBtn} accessibilityRole="button" accessibilityLabel="Play sermon audio">
                <LinearGradient colors={Gradients.glory} style={styles.playGradient}>
                  <Text style={styles.playIcon}>▶</Text>
                  <Text style={styles.playLabel}>Play sermon audio</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollReveal>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingHorizontal: Spacing.pagePadding,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
    position: 'relative',
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32 },
  sermonTitle: {
    color: Colors.white,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
    lineHeight: FontSize.h2 * 1.2,
  },
  preacher: { color: Colors.gold, fontSize: FontSize.body, fontWeight: FontWeight.medium },
  date: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.small },
  content: { padding: Spacing.pagePadding, gap: Spacing.xl },
  sectionLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.widest,
    marginBottom: Spacing.sm,
  },
  notes: { fontSize: FontSize.body, lineHeight: FontSize.body * 1.75 },
  playBtn: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  playGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  playIcon: { color: Colors.purple, fontSize: 20, fontWeight: FontWeight.bold },
  playLabel: { color: Colors.purple, fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
});
