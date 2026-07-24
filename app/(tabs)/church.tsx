import React, { useMemo } from 'react';
import { ImageSourcePropType, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChurchBuilding } from '../../src/components/worship';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { TypewriterText } from '../../src/components/animations/TypewriterText';
import { PopPressable } from '../../src/components/common/PopPressable';
import { WatermarkBackground } from '../../src/components/common/WatermarkBackground';
import { ScreenPhotos, WorshipImages } from '../../src/utils/worshipImages';
import { churchApi } from '../../src/api/church';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontFamily, FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import { StaggerDelay } from '../../src/theme/animations';

type Feature = { title: string; desc: string; route: any; photo: ImageSourcePropType };

// Hub redesign (2026-07-18): the flat 14-tile grid is now DIVIDED into labeled
// groups, and every feature is a real-photo card (dark scrim keeps text clear
// without fighting the rotating background). This is where the low-res accent
// photos live — tile-sized, never full screen.
const GROUPS: { label: string; features: Feature[] }[] = [
  {
    label: 'Worship',
    features: [
      { title: 'Live', desc: 'Watch the service', route: '/live', photo: WorshipImages.pianoWorship2 },
      { title: 'Sermons', desc: 'Messages & audio', route: '/sermons', photo: WorshipImages.worshipLeader1 },
      { title: 'Devotional', desc: "Today's word", route: '/devotional', photo: WorshipImages.worshipSolo1 },
      { title: 'Prayer Wall', desc: 'Pray together', route: '/prayer', photo: WorshipImages.prayer2 },
      { title: 'Gallery', desc: 'Photo moments', route: '/gallery', photo: WorshipImages.celebration1 },
    ],
  },
  {
    label: 'Community',
    features: [
      { title: 'Groups', desc: 'Your ministries', route: '/groups', photo: WorshipImages.congregation4 },
      { title: 'Attendance', desc: 'Check in & records', route: '/attendance', photo: WorshipImages.sanctuarySmall1 },
      { title: 'Events', desc: "What's coming up", route: '/events', photo: WorshipImages.sanctuaryBlue1 },
      { title: 'Announcements', desc: 'Church news', route: '/announcements', photo: WorshipImages.congregation3 },
      { title: 'Polls', desc: 'Have your say', route: '/polls', photo: WorshipImages.crowd2 },
      { title: 'Hall of Fame', desc: 'Honoured members', route: '/hall-of-fame', photo: WorshipImages.worshipHands2 },
    ],
  },
  {
    label: 'Giving & Stewardship',
    features: [
      { title: 'Projects', desc: 'Building & fundraising', route: '/projects', photo: WorshipImages.congregation2 },
      { title: 'Pledges', desc: 'Promises made', route: '/pledges', photo: WorshipImages.worshipHands3 },
      { title: 'Store', desc: 'Books & merch', route: '/store', photo: WorshipImages.singerTeal1 },
    ],
  },
  {
    label: 'Resources',
    features: [
      { title: 'Ask Klink', desc: 'AI help & guidance', route: '/assistant', photo: WorshipImages.worshipNp1 },
      { title: 'Church Files', desc: 'Docs & forms', route: '/files', photo: WorshipImages.worshipService1 },
      { title: 'Facilities', desc: 'Buildings & assets', route: '/facilities', photo: WorshipImages.churchInterior1 },
    ],
  },
];

export default function ChurchScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();

  const { data: church } = useQuery({
    queryKey: ['church-settings'],
    queryFn: () => churchApi.getSettings(),
  });

  // Role-aware tiles: Automatic Giving for everyone; Insights (growth dashboard)
  // for Pastor/Elder only — mirrors the backend /analytics/dashboard gate.
  const groups = useMemo(() => GROUPS.map((g) => {
    if (g.label !== 'Giving & Stewardship') return g;
    const extra: Feature[] = [
      { title: 'Automatic Giving', desc: 'Monthly reminders', route: '/giving/recurring', photo: WorshipImages.congregation1 },
    ];
    if (role === 'PASTOR' || role === 'ELDER') {
      extra.push({ title: 'Insights', desc: 'Growth & trends', route: '/analytics', photo: WorshipImages.praiseNature1 });
    }
    return { ...g, features: [...g.features, ...extra] };
  }), [role]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Distinct static photo header — not the global rotation */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Image
            source={ScreenPhotos.church}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={300}
          />
          <LinearGradient
            colors={['rgba(26,5,51,0.35)', 'rgba(26,5,51,0.65)', 'rgba(10,5,32,0.92)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroArt} pointerEvents="none">
            <ChurchBuilding width={200} height={160} />
          </View>
          <TypewriterText
            text={church?.churchName ?? 'Our Church'}
            style={styles.headerTitle}
            numberOfLines={2}
            charDelayMs={42}
          />
          <TypewriterText
            text={church?.location ?? 'Everything your church shares, in one place'}
            style={styles.headerSub}
            charDelayMs={18}
            startDelayMs={900}
          />
        </View>

        {groups.map((group, g) => (
          <View key={group.label} style={styles.groupBlock}>
            <View style={styles.groupHeader}>
              {/* Each group label writes itself, staggered down the page */}
              <TypewriterText
                text={group.label}
                style={styles.groupEyebrow}
                charDelayMs={30}
                startDelayMs={250 + g * 300}
              />
              <View style={styles.groupRule} />
            </View>
            <View style={styles.grid}>
              {group.features.map((s, i) => (
                // Meet-in-the-center choreography: left-column tiles glide in
                // from the LEFT, right-column tiles from the RIGHT, and both
                // tiles of a row share one delay so they arrive together.
                <ScrollReveal
                  key={s.route}
                  delay={Math.min(g * 2 + Math.floor(i / 2), 7) * StaggerDelay.list}
                  direction={i % 2 === 0 ? 'right' : 'left'}
                  distance={72}
                  scaleFrom={0.97}
                  style={styles.gridItem}
                >
                  <PopPressable
                    onPress={() => { haptics.light(); router.push(s.route); }}
                    style={styles.photoTile}
                    flashRadius={BorderRadius.lg}
                    accessibilityRole="button"
                    accessibilityLabel={s.title}
                  >
                    <Image
                      source={s.photo}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={200}
                    />
                    {/* Dark scrim — text always reads, photo never fights the layout */}
                    <LinearGradient
                      colors={['rgba(10,5,32,0.1)', 'rgba(10,5,32,0.55)', 'rgba(10,5,32,0.92)']}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.tileText}>
                      {/* Title writes itself right after its tile glides in */}
                      <TypewriterText
                        text={s.title}
                        style={styles.tileTitle}
                        numberOfLines={1}
                        charDelayMs={35}
                        startDelayMs={Math.min(g * 2 + Math.floor(i / 2), 7) * StaggerDelay.list + 420}
                      />
                      <Text style={styles.tileDesc} numberOfLines={1}>{s.desc}</Text>
                    </View>
                  </PopPressable>
                </ScrollReveal>
              ))}
            </View>
          </View>
        ))}
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
    // The church's own name in the serif display voice — the hero as thesis.
    color: Colors.white,
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.h2,
    letterSpacing: LetterSpacing.tight,
    maxWidth: '70%',
  },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: FontSize.small, maxWidth: '70%' },
  // Divided photo-card sections (2026-07-18 redesign)
  groupBlock: { paddingHorizontal: Spacing.pagePadding, marginTop: Spacing.lg },
  groupHeader: { gap: 8, marginBottom: Spacing.md },
  groupEyebrow: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: FontWeight.semiBold,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  groupRule: { height: 1, backgroundColor: 'rgba(244,164,41,0.2)' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.sm,
  },
  gridItem: { width: '48.5%' },
  photoTile: {
    height: 132,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.25)',
    borderTopColor: 'rgba(255,255,255,0.28)', // light edge
    justifyContent: 'flex-end',
  },
  tileText: { padding: Spacing.sm + 2, gap: 2 },
  tileTitle: { color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold },
  tileDesc: { color: 'rgba(245,240,255,0.75)', fontSize: FontSize.caption },
});
