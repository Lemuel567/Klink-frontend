import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PhotoHeader } from '../../src/components/common/PhotoHeader';
import { TypewriterText } from '../../src/components/animations/TypewriterText';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { Colors } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import { StaggerDelay } from '../../src/theme/animations';

type Item = { icon: string; title: string; desc: string; route: string; leadersOnly?: boolean };

const ITEMS: Item[] = [
  { icon: '📖', title: 'Daily Word', desc: "Today's verse, a reflection, and a chat about it", route: '/bible' },
  { icon: '🌟', title: 'Your Journey', desc: 'Your giving, attendance, pledges & milestones', route: '/profile/journey' },
  { icon: '💬', title: 'Ask Klink', desc: 'AI help finding your way around the app', route: '/assistant' },
  { icon: '💳', title: 'Payments', desc: "Everything you've paid through the app", route: '/payments' },
  { icon: '📊', title: 'Insights', desc: 'Church attendance & giving trends', route: '/analytics', leadersOnly: true },
];

export default function ForYouScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const isLeader = role === 'PASTOR' || role === 'ELDER';

  const items = ITEMS.filter((i) => !i.leadersOnly || isLeader);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PhotoHeader style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.eyebrow}>JUST FOR YOU</Text>
        <TypewriterText text="For You" style={styles.headerTitle} charDelayMs={42} />
        <Text style={styles.headerSub}>Your personal space in Klink</Text>
      </PhotoHeader>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.pagePadding, paddingBottom: insets.bottom + 100, gap: Spacing.sm }}>
        {items.map((item, i) => (
          <ScrollReveal key={item.route} delay={i * StaggerDelay.list}>
            <TouchableOpacity
              onPress={() => { haptics.light(); router.push(item.route as any); }}
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}: ${item.desc}`}
            >
              <View style={styles.iconWrap}>
                <Text style={styles.icon}>{item.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.cardDesc, { color: theme.textMuted }]} numberOfLines={2}>{item.desc}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </ScrollReveal>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.lg, gap: 2 },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  eyebrow: { color: Colors.gold, fontSize: 11, fontWeight: FontWeight.semiBold, letterSpacing: 2.2, textTransform: 'uppercase' },
  headerTitle: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.tight },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  iconWrap: {
    width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(244,164,41,0.14)', borderWidth: 1, borderColor: 'rgba(244,164,41,0.3)',
  },
  icon: { fontSize: 22 },
  cardTitle: { fontSize: FontSize.body, fontWeight: FontWeight.bold },
  cardDesc: { fontSize: FontSize.caption, marginTop: 2, lineHeight: FontSize.caption * 1.4 },
  chevron: { color: Colors.gold, fontSize: 26, fontWeight: FontWeight.bold },
});
