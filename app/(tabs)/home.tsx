import React, { useCallback } from 'react';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { WorshipHero } from '../../src/components/church/WorshipHero';
import { ChurchBuilding } from '../../src/components/worship';
import { CountUp } from '../../src/components/common/CountUp';
import { ScriptureReveal } from '../../src/components/church/ScriptureReveal';
import { TitheThermometer } from '../../src/components/church/TitheThermometer';
import { AnnouncementCard } from '../../src/components/screens/AnnouncementCard';
import { SermonCard } from '../../src/components/screens/SermonCard';
import { EventCard } from '../../src/components/screens/EventCard';
import { ProjectCard } from '../../src/components/screens/ProjectCard';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import {
  AnnouncementSkeleton,
  SermonCardSkeleton,
  StatCardSkeleton,
} from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { announcementsApi, Announcement } from '../../src/api/announcements';
import { sermonsApi, Sermon } from '../../src/api/sermons';
import { eventsApi, ChurchEvent } from '../../src/api/events';
import { projectsApi, Project } from '../../src/api/projects';
import { givingApi } from '../../src/api/giving';
import { devotionalsApi } from '../../src/api/devotionals';
import { attendanceApi } from '../../src/api/attendance';
import { formatCurrency } from '../../src/utils/formatters';
import { useParallax } from '../../src/hooks/useParallax';
import { useAuthStore, useUser, useRole } from '../../src/store/authStore';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';

const { height } = Dimensions.get('window');
const HERO_HEIGHT = height * 0.42;

const DAILY_VERSE = {
  verse: '"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future."',
  reference: 'Jeremiah 29:11',
};

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const user = useUser();
  const role = useRole();
  const canManageContent = role === 'PASTOR' || role === 'ELDER' || role === 'MANAGER';
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const { scrollHandler, bgStyle, midStyle, headerOpacity } = useParallax(HERO_HEIGHT);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const { data: announcements, isLoading: loadingAnn, isRefetching: refetchingAnn, refetch: refetchAnn } =
    useQuery({ queryKey: ['announcements'], queryFn: () => announcementsApi.list({ size: 5 }) });

  const { data: sermons, isLoading: loadingSermons, refetch: refetchSermons } =
    useQuery({ queryKey: ['sermons', 'home-preview'], queryFn: () => sermonsApi.list({ size: 5 }) });

  const { data: events, isLoading: loadingEvents, refetch: refetchEvents } =
    useQuery({ queryKey: ['events'], queryFn: () => eventsApi.list({ size: 5 }) });

  const { data: projects, isLoading: loadingProjects, refetch: refetchProjects } =
    useQuery({ queryKey: ['projects', 'home-preview'], queryFn: () => projectsApi.list({ size: 4, status: 'FUNDRAISING' }) });

  // Member's own giving — real data from /finances/me (church-wide totals are not
  // exposed to every role, so the card reflects the signed-in member's giving).
  const { data: myPayments, refetch: refetchGiving } =
    useQuery({ queryKey: ['myPayments'], queryFn: () => givingApi.getMyPayments({ size: 100 }) });
  const myGivingTotal = myPayments?.content?.reduce((s: number, p: { amount: number }) => s + p.amount, 0) ?? 0;

  // Latest devotional drives the verse widget; static verse is the fallback
  const { data: devotionals, refetch: refetchDevotionals } =
    useQuery({ queryKey: ['devotionals-latest'], queryFn: () => devotionalsApi.getAll({ size: 1 }) });
  const latestDevotional = devotionals?.content?.[0];
  const verse = latestDevotional
    ? { verse: latestDevotional.content, reference: latestDevotional.title }
    : DAILY_VERSE;

  // Member's own attendance — count of services marked PRESENT
  const { data: myAttendance, refetch: refetchAttendance } =
    useQuery({ queryKey: ['attendance-me-summary'], queryFn: () => attendanceApi.getMe({ size: 100 }) });
  const presentCount =
    myAttendance?.content?.filter((r: { status: string }) => r.status === 'PRESENT').length ?? 0;

  const isRefreshing = refetchingAnn;
  const handleRefresh = useCallback(() => {
    refetchAnn();
    refetchSermons();
    refetchEvents();
    refetchProjects();
    refetchGiving();
    refetchDevotionals();
    refetchAttendance();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Screen veil only — the root RotatingBackground photo shows through */}
      {/* Sticky header that morphs transparent → purple */}
      <Animated.View
        style={[
          styles.stickyHeader,
          { paddingTop: insets.top },
          headerOpacity,
        ]}
      >
        <Text style={styles.headerTitle}>Klink</Text>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />
        }
      >
        {/* Hero with 3-layer parallax */}
        <WorshipHero
          title={`${greeting},\n${user?.fullName?.split(' ')[0] ?? 'Beloved'}`}
          subtitle="Welcome to your church"
          bgStyle={bgStyle}
          midStyle={midStyle}
          height={HERO_HEIGHT}
          rotating
          illustration={<ChurchBuilding width={220} height={180} />}
        >
          <View style={{ paddingTop: insets.top + 16 }} />
        </WorshipHero>

        {/* Daily verse */}
        <ScrollReveal delay={0}>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, { color: Colors.gold, marginBottom: 0 }]}>TODAY'S VERSE</Text>
              <TouchableOpacity
                onPress={() => router.push('/devotional')}
                accessibilityRole="button"
                accessibilityLabel="View daily devotionals"
              >
                <Text style={styles.seeAll}>Devotionals ›</Text>
              </TouchableOpacity>
            </View>
            <ScriptureReveal verse={verse.verse} reference={verse.reference} />
          </View>
        </ScrollReveal>

        {/* Bento grid stats */}
        <ScrollReveal delay={100}>
          <View style={styles.bentoGrid}>
            <StatCard label="My attendance" count={presentCount} sub="services present" color={Colors.blue} delay={0} />
            <StatCard label="Your giving" value={formatCurrency(myGivingTotal)} sub="recorded total" color={Colors.green} delay={80} />
            <StatCard label="Upcoming" count={events?.content?.length ?? 0} sub="events" color={Colors.gold} delay={160} />
            <StatCard label="Active projects" count={projects?.content?.length ?? 0} sub="fundraising" color={Colors.roseGold} delay={240} />
          </View>
        </ScrollReveal>

        {/* Active projects */}
        <View style={styles.section}>
          <SectionHeader label="Active Projects" onSeeAll={() => router.push('/projects')} />
          {loadingProjects ? (
            <SermonCardSkeleton />
          ) : (projects?.content?.length ?? 0) > 0 ? (
            projects?.content?.slice(0, 2).map((p: Project, i: number) => (
              <ProjectCard
                key={p.id}
                project={p}
                index={i}
                onPress={() => router.push(`/projects/${p.id}`)}
              />
            ))
          ) : (
            <EmptyState
              icon="🏗"
              title="No active projects"
              subtitle="Fundraising and construction projects will appear here"
              actionLabel={canManageContent ? 'Create project' : undefined}
              onAction={canManageContent ? () => router.push('/projects') : undefined}
            />
          )}
        </View>

        {/* Announcements */}
        <View style={styles.section}>
          <SectionHeader label="Announcements" onSeeAll={() => router.push('/announcements')} />
          {loadingAnn
            ? Array.from({ length: 3 }, (_, i) => <AnnouncementSkeleton key={i} />)
            : (announcements?.content?.length ?? 0) > 0
            ? announcements?.content?.map((a: Announcement, i: number) => (
                <AnnouncementCard key={a.id} announcement={a} index={i} />
              ))
            : (
              <EmptyState
                icon="📢"
                title="No announcements yet"
                subtitle="Church announcements will appear here"
                actionLabel={canManageContent ? 'Post announcement' : undefined}
                onAction={canManageContent ? () => router.push('/announcements/new') : undefined}
              />
            )}
        </View>

        {/* Upcoming events */}
        <View style={styles.section}>
          <SectionHeader label="Upcoming Events" onSeeAll={() => router.push('/events')} />
          {loadingEvents
            ? Array.from({ length: 2 }, (_, i) => <AnnouncementSkeleton key={i} />)
            : (events?.content?.length ?? 0) > 0
            ? events?.content?.slice(0, 3).map((e: ChurchEvent, i: number) => (
                <EventCard key={e.id} event={e} index={i} />
              ))
            : (
              <EmptyState
                icon="📅"
                title="No upcoming events"
                subtitle="Upcoming church events and services will appear here"
                actionLabel={canManageContent ? 'Add event' : undefined}
                onAction={canManageContent ? () => router.push('/events') : undefined}
              />
            )}
        </View>

        {/* Recent sermons */}
        <View style={[styles.section, { paddingBottom: 100 }]}>
          <SectionHeader label="Recent Sermons" onSeeAll={() => router.push('/sermons')} />
          {loadingSermons
            ? Array.from({ length: 2 }, (_, i) => <SermonCardSkeleton key={i} />)
            : (sermons?.content?.length ?? 0) > 0
            ? sermons?.content?.slice(0, 3).map((s: Sermon, i: number) => (
                <SermonCard key={s.id} sermon={s} index={i} onPress={() => router.push(`/sermons/${s.id}`)} />
              ))
            : (
              <EmptyState
                icon="🎙"
                title="No sermons recorded"
                subtitle="Sermons and messages from your pastor will appear here"
                actionLabel={canManageContent ? 'Add sermon' : undefined}
                onAction={canManageContent ? () => router.push('/sermons') : undefined}
              />
            )}
        </View>
      </Animated.ScrollView>

      {/* Quick action FAB row */}
      <QuickActions insets={insets} />
    </View>
  );
}

function SectionHeader({ label, onSeeAll }: { label: string; onSeeAll?: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{label}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} accessibilityRole="link">
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StatCard({
  label,
  value,
  count,
  sub,
  color,
  delay,
}: {
  label: string;
  value?: string;
  /** When provided, the value animates up from 0 to this number. */
  count?: number;
  sub: string;
  color: string;
  delay: number;
}) {
  const { theme } = useTheme();
  return (
    <ScrollReveal delay={delay} style={styles.statCard}>
      <View style={[styles.statAccent, { backgroundColor: `${color}25` }]}>
        {count !== undefined ? (
          <CountUp value={count} style={[styles.statValue, { color }]} />
        ) : (
          <Text style={[styles.statValue, { color }]}>{value}</Text>
        )}
      </View>
      <Text style={[styles.statLabel, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.statSub, { color: theme.textMuted }]}>{sub}</Text>
    </ScrollReveal>
  );
}

// ─── Premium 3D quick actions ────────────────────────────────────────────────
// 72×72 gradient tiles with SVG icons, floating idle bob (staggered wave),
// spring press-scale, gradient-matched shadows, and medium haptics.

const QUICK_ACTIONS: {
  label: string;
  gradient: readonly [string, string];
  icon: string; // 24×24 SVG path, stroke style
  route: string;
}[] = [
  {
    label: 'Check In',
    gradient: ['#2D1B69', '#6B3FA0'],
    icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
    route: '/attendance',
  },
  {
    label: 'Give',
    gradient: ['#854F0B', '#F4A429'],
    icon: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z',
    route: '/(tabs)/giving',
  },
  {
    label: 'Prayer',
    gradient: ['#0C447C', '#4A90D9'],
    icon: 'M12 3v18 M7 8h10',
    route: '/prayer',
  },
  {
    label: 'Contact',
    gradient: ['#085041', '#1D9E75'],
    icon: 'M21 11.5a8.38 8.38 0 0 1-9 8.4 8.5 8.5 0 0 1-3.4-.7L3 21l1.8-5.6A8.38 8.38 0 0 1 3.6 11.5a8.5 8.5 0 0 1 8.4-8.4 8.38 8.38 0 0 1 9 8.4z',
    route: '/church/settings',
  },
];

function QuickActionButton({
  action,
  index,
}: {
  action: (typeof QUICK_ACTIONS)[number];
  index: number;
}) {
  const haptics = useHaptics();
  const scale = useSharedValue(1);
  const bob = useSharedValue(0);

  // Idle floating bob — each button offset by 300ms creating a gentle wave
  React.useEffect(() => {
    bob.value = withDelay(
      index * 300,
      withRepeat(
        withTiming(-3, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={() => { scale.value = withTiming(0.92, { duration: 90 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 8, stiffness: 200 }); }}
        onPress={() => { haptics.medium(); router.push(action.route as any); }}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        style={[styles.qaShadow, { shadowColor: action.gradient[0] }]}
      >
        <LinearGradient
          colors={action.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.qaTile}
        >
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path
              d={action.icon}
              stroke={Colors.white}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.qaLabel} numberOfLines={1}>
            {action.label}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

function QuickActions({ insets }: { insets: any }) {
  return (
    <View style={[styles.fabRow, { paddingBottom: insets.bottom + 80 }]}>
      {QUICK_ACTIONS.map((a, i) => (
        <QuickActionButton key={a.label} action={a} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: Spacing.pagePadding,
    paddingBottom: 12,
    alignItems: 'center',
  },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.wide,
  },
  section: { paddingTop: Spacing.lg, gap: 0 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.pagePadding,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.h4,
    fontWeight: FontWeight.bold,
  },
  seeAll: {
    color: Colors.gold,
    fontSize: FontSize.small,
    fontWeight: FontWeight.medium,
  },
  sectionLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.widest,
    marginBottom: Spacing.sm,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.pagePadding,
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  statCard: {
    width: '47.5%',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statAccent: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: { fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  statLabel: { fontSize: FontSize.small, fontWeight: FontWeight.medium },
  statSub: { fontSize: FontSize.caption },
  fabRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  // Floating 3D shadow — colour is set per-button to match its gradient
  qaShadow: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    borderRadius: 20,
  },
  qaTile: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  qaLabel: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: FontWeight.semiBold,
    letterSpacing: 0.2,
  },
});
