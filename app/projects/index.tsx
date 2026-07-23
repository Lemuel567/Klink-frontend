import React from 'react';
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ProjectCard } from '../../src/components/screens/ProjectCard';
import { SermonCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { ChurchBuilding } from '../../src/components/worship';
import { WatermarkBackground } from '../../src/components/common/WatermarkBackground';
import { ScreenPhotos } from '../../src/utils/worshipImages';
import { projectsApi, Project } from '../../src/api/projects';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import { PAGE_SIZE } from '../../src/utils/constants';
import { TypewriterText } from '../../src/components/animations/TypewriterText';

// 2026-07-12: creation is Pastor + Manager ONLY (matches backend)
const CAN_CREATE = ['PASTOR', 'MANAGER'];

export default function ProjectsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const canCreate = role ? CAN_CREATE.includes(role) : false;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['projects'],
      queryFn: ({ pageParam = 0 }) => projectsApi.list({ page: pageParam, size: PAGE_SIZE }),
      // Null-armored: a malformed/partial page must never crash the screen
      getNextPageParam: (last) => {
        if (!last || !Array.isArray(last.content)) return undefined;
        const number = last.number ?? 0;
        const totalPages = last.totalPages ?? 0;
        return number + 1 < totalPages ? number + 1 : undefined;
      },
      initialPageParam: 0,
    });

  const projects: Project[] = (data?.pages ?? [])
    .flatMap((p) => p?.content ?? [])
    .filter((p): p is Project => Boolean(p?.id));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <WatermarkBackground
        imageSource={ScreenPhotos.projects}
        overlayOpacity={0.6}
        overlayColor="#1A0533"
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        {/* Church building with stained glass behind the title */}
        <View style={styles.heroArt} pointerEvents="none">
          <ChurchBuilding width={190} height={155} />
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
         
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <TypewriterText text="Church Projects" style={styles.headerTitle} charDelayMs={42} />
        <Text style={styles.headerSub}>See what our church is building and achieving</Text>
      </WatermarkBackground>

      {isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 4 }, (_, i) => <SermonCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={projects}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ProjectCard project={item} index={index} onPress={() => router.push(`/projects/${item.id}`)} />
          )}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />}
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                {isError
                  ? "Couldn't load projects."
                  : canCreate
                    ? 'No projects yet — create the first one.'
                    : 'No projects yet'}
              </Text>
              {isError && (
                <TouchableOpacity
                  onPress={() => refetch()}
                  style={styles.retryBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading projects"
                >
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Create FAB — Pastor / Elder / Manager only */}
      {canCreate && (
        <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            onPress={() => { haptics.medium(); router.push('/projects/new'); }}
            style={styles.fab}
            accessibilityRole="button"
            accessibilityLabel="Create a new project"
          >
            <LinearGradient colors={Gradients.glory} style={styles.fabGradient}>
              <Text style={styles.fabText}>+ New Project</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.lg, gap: 4, overflow: 'hidden' },
  heroArt: { position: 'absolute', right: -8, top: 6, opacity: 0.32 },
  headerTitle: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.tight },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  empty: { padding: Spacing.xxxl, alignItems: 'center', gap: Spacing.md },
  emptyText: { fontSize: FontSize.body, textAlign: 'center' },
  retryBtn: {
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: 999,
    paddingHorizontal: Spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryText: { color: Colors.gold, fontWeight: FontWeight.bold, fontSize: FontSize.small },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  fabContainer: { position: 'absolute', right: Spacing.pagePadding, bottom: 0 },
  fab: { borderRadius: 999, overflow: 'hidden' },
  fabGradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderRadius: 999,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.body },
});
