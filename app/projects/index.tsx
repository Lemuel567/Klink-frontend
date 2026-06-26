import React from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ProjectCard } from '../../src/components/screens/ProjectCard';
import { SermonCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { projectsApi, Project } from '../../src/api/projects';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { PAGE_SIZE } from '../../src/utils/constants';

export default function ProjectsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['projects'],
      queryFn: ({ pageParam = 0 }) => projectsApi.list({ page: pageParam, size: PAGE_SIZE }),
      getNextPageParam: (last) =>
        last.number + 1 < last.totalPages ? last.number + 1 : undefined,
      initialPageParam: 0,
    });

  const projects: Project[] = data?.pages.flatMap((p) => p.content) ?? [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient colors={Gradients.worship} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Projects</Text>
        <Text style={styles.headerSub}>Building for God's Kingdom</Text>
      </LinearGradient>

      {isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 4 }, (_, i) => <SermonCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={projects}
          estimatedItemSize={240}
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
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No projects yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.lg, gap: 4 },
  headerTitle: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.tight },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  empty: { padding: Spacing.xxxl, alignItems: 'center' },
  emptyText: { fontSize: FontSize.body },
});
