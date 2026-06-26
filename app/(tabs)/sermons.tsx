import React from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SermonCard } from '../../src/components/screens/SermonCard';
import { SermonCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { sermonsApi, Sermon } from '../../src/api/sermons';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { PAGE_SIZE } from '../../src/utils/constants';

export default function SermonsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['sermons'],
      queryFn: ({ pageParam = 0 }) => sermonsApi.list({ page: pageParam, size: PAGE_SIZE }),
      getNextPageParam: (last) =>
        last.number + 1 < last.totalPages ? last.number + 1 : undefined,
      initialPageParam: 0,
    });

  const sermons: Sermon[] = data?.pages.flatMap((p) => p.content) ?? [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Hero header */}
      <LinearGradient
        colors={Gradients.worship}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.headerTitle}>Sermons</Text>
        <Text style={styles.headerSub}>Messages from the Word</Text>
      </LinearGradient>

      {isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 5 }, (_, i) => <SermonCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={sermons}
          estimatedItemSize={220}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <SermonCard
              sermon={item}
              index={index}
              featured={index === 0}
              onPress={() => router.push(`/sermons/${item.id}`)}
            />
          )}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No sermons yet
              </Text>
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <SermonCardSkeleton />
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />
          }
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: 100 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.pagePadding,
    paddingBottom: Spacing.lg,
    gap: 4,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  empty: { padding: Spacing.xxxl, alignItems: 'center' },
  emptyText: { fontSize: FontSize.body },
});
