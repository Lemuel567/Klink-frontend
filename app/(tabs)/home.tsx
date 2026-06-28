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
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { WorshipHero } from '../../src/components/church/WorshipHero';
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
    useQuery({ queryKey: ['sermons'], queryFn: () => sermonsApi.list({ size: 5 }) });

  const { data: events, isLoading: loadingEvents, refetch: refetchEvents } =
    useQuery({ queryKey: ['events'], queryFn: () => eventsApi.list({ size: 5 }) });

  const { data: projects, isLoading: loadingProjects, refetch: refetchProjects } =
    useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.list({ size: 4, status: 'FUNDRAISING' }) });

  const isRefreshing = refetchingAnn;
  const handleRefresh = useCallback(() => {
    refetchAnn();
    refetchSermons();
    refetchEvents();
    refetchProjects();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
        >
          <View style={{ paddingTop: insets.top + 16 }} />
        </WorshipHero>

        {/* Daily verse */}
        <ScrollReveal delay={0}>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionLabel, { color: Colors.gold }]}>TODAY'S VERSE</Text>
            <ScriptureReveal verse={DAILY_VERSE.verse} reference={DAILY_VERSE.reference} />
          </View>
        </ScrollReveal>

        {/* Bento grid stats */}
        <ScrollReveal delay={100}>
          <View style={styles.bentoGrid}>
            <StatCard label="This Sunday" value="–" sub="attendance" color={Colors.blue} delay={0} />
            <StatCard label="Monthly giving" value="–" sub="total collected" color={Colors.green} delay={80} />
            <StatCard label="Upcoming" value={String(events?.content?.length ?? 0)} sub="events" color={Colors.gold} delay={160} />
            <StatCard label="Active projects" value={String(projects?.content?.length ?? 0)} sub="fundraising" color={Colors.roseGold} delay={240} />
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
          <SectionHeader label="Recent Sermons" onSeeAll={() => router.push('/(tabs)/sermons')} />
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
                onAction={canManageContent ? () => router.push('/(tabs)/sermons') : undefined}
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
  sub,
  color,
  delay,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  delay: number;
}) {
  const { theme } = useTheme();
  return (
    <ScrollReveal delay={delay} style={styles.statCard}>
      <View style={[styles.statAccent, { backgroundColor: `${color}25` }]}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
      <Text style={[styles.statLabel, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.statSub, { color: theme.textMuted }]}>{sub}</Text>
    </ScrollReveal>
  );
}

function QuickActions({ insets }: { insets: any }) {
  const haptics = useHaptics();
  const actions = [
    { label: 'Check In', color: Colors.blue, onPress: () => {} },
    { label: 'Give', color: Colors.gold, onPress: () => router.push('/(tabs)/giving') },
    { label: 'Prayer', color: Colors.roseGold, onPress: () => {} },
    { label: 'Contact', color: Colors.purple, onPress: () => {} },
  ];
  return (
    <View style={[styles.fabRow, { paddingBottom: insets.bottom + 80 }]}>
      {actions.map((a) => (
        <TouchableOpacity
          key={a.label}
          onPress={() => { haptics.medium(); a.onPress(); }}
          style={[styles.fab, { backgroundColor: a.color }]}
          accessibilityRole="button"
          accessibilityLabel={a.label}
        >
          <Text style={styles.fabLabel}>{a.label}</Text>
        </TouchableOpacity>
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
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  fab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    minHeight: 44,
    justifyContent: 'center',
  },
  fabLabel: {
    color: Colors.white,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wide,
  },
});
