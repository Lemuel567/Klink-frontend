import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChurchBuilding } from '../../src/components/worship';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { WatermarkBackground } from '../../src/components/common/WatermarkBackground';
import { ScreenPhotos } from '../../src/utils/worshipImages';
import { churchApi } from '../../src/api/church';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { StaggerDelay } from '../../src/theme/animations';

// Hub for everything the church publishes — each row is a fully-wired screen.
const SECTIONS = [
  { title: 'Church Projects', desc: 'See what our church is building and achieving', icon: '🏗️', route: '/projects' as const, color: Colors.gold },
  { title: 'Announcements', desc: 'Stay up to date with your church', icon: '📣', route: '/announcements' as const, color: Colors.purpleLight },
  { title: 'Events', desc: "What's happening and when", icon: '📅', route: '/events' as const, color: Colors.blue },
  { title: 'Sermons', desc: 'Messages from the Word', icon: '📖', route: '/sermons' as const, color: Colors.green },
  { title: 'Prayer Wall', desc: 'Bring your requests before God together', icon: '🙏', route: '/prayer' as const, color: Colors.roseGold },
  { title: 'Daily Devotional', desc: 'Verse and reflection for today', icon: '✝️', route: '/devotional' as const, color: Colors.goldDim },
  { title: 'Church Store', desc: 'Books, merch and materials from your church', icon: '🛍️', route: '/store' as const, color: Colors.stageAmber },
];

export default function ChurchScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  const { data: church } = useQuery({
    queryKey: ['church-settings'],
    queryFn: () => churchApi.getSettings(),
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        <WatermarkBackground
          imageSource={ScreenPhotos.church}
          overlayOpacity={0.55}
          overlayColor="#1A0533"
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.heroArt} pointerEvents="none">
            <ChurchBuilding width={200} height={160} />
          </View>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {church?.churchName ?? 'Our Church'}
          </Text>
          <Text style={styles.headerSub}>
            {church?.location ?? 'Everything your church shares, in one place'}
          </Text>
        </WatermarkBackground>

        <View style={styles.sections}>
          {SECTIONS.map((s, i) => (
            <ScrollReveal key={s.route} delay={i * StaggerDelay.list}>
              <TouchableOpacity
                onPress={() => { haptics.light(); router.push(s.route); }}
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
                accessibilityRole="button"
                accessibilityLabel={s.title}
              >
                <View style={[styles.iconWrap, { backgroundColor: `${s.color}20` }]}>
                  <Text style={styles.icon}>{s.icon}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{s.title}</Text>
                  <Text style={[styles.cardDesc, { color: theme.textMuted }]} numberOfLines={1}>
                    {s.desc}
                  </Text>
                </View>
                <Text style={[styles.chevron, { color: theme.textMuted }]}>›</Text>
              </TouchableOpacity>
            </ScrollReveal>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.pagePadding,
    paddingBottom: Spacing.xl,
    gap: 4,
    overflow: 'hidden',
    borderBottomLeftRadius: BorderRadius.xxl,
    borderBottomRightRadius: BorderRadius.xxl,
  },
  heroArt: { position: 'absolute', right: -10, top: 10, opacity: 0.3 },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
    maxWidth: '70%',
  },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: FontSize.small, maxWidth: '70%' },
  sections: { padding: Spacing.pagePadding, gap: Spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    minHeight: 72,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  cardDesc: { fontSize: FontSize.caption },
  chevron: { fontSize: 26, fontWeight: FontWeight.regular },
});
