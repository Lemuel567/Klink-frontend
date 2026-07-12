import React, { useState } from 'react';
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SermonCard } from '../../src/components/screens/SermonCard';
import { SermonCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { OpenBible } from '../../src/components/worship';
import { WatermarkBackground } from '../../src/components/common/WatermarkBackground';
import { ScreenPhotos } from '../../src/utils/worshipImages';
import { sermonsApi, Sermon } from '../../src/api/sermons';
import { useBookmarkStore } from '../../src/store/bookmarkStore';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { PAGE_SIZE } from '../../src/utils/constants';

type Tab = 'all' | 'saved';

export default function SermonsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const [tab, setTab] = useState<Tab>('all');
  const bookmarkedIds = useBookmarkStore((s) => s.sermonIds);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['sermons'],
      queryFn: ({ pageParam = 0 }) => sermonsApi.list({ page: pageParam, size: PAGE_SIZE }),
      getNextPageParam: (last) =>
        last.number + 1 < last.totalPages ? last.number + 1 : undefined,
      initialPageParam: 0,
    });

  const allSermons: Sermon[] = data?.pages.flatMap((p) => p.content) ?? [];
  const sermons =
    tab === 'saved' ? allSermons.filter((s) => bookmarkedIds.includes(s.id)) : allSermons;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Hero header — bright sanctuary photo (congregation-2) */}
      <WatermarkBackground
        imageSource={ScreenPhotos.sermons}
        overlayOpacity={0.6}
        overlayColor="#1A0533"
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        {/* Open Bible with light rays behind the title */}
        <View style={styles.heroArt} pointerEvents="none">
          <OpenBible width={200} height={150} />
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sermons</Text>
        <Text style={styles.headerSub}>Messages from the Word</Text>

        {/* All / Saved tabs */}
        <View style={styles.tabBar}>
          {(['all', 'saved'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => { haptics.light(); setTab(t); }}
              style={[styles.tab, tab === t && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'all' ? 'All' : `Saved${bookmarkedIds.length > 0 ? ` (${bookmarkedIds.length})` : ''}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </WatermarkBackground>

      {isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 5 }, (_, i) => <SermonCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={sermons}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <SermonCard
              sermon={item}
              index={index}
              featured={tab === 'all' && index === 0}
              onPress={() => router.push(`/sermons/${item.id}`)}
            />
          )}
          onEndReached={() =>
            tab === 'all' && hasNextPage && !isFetchingNextPage && fetchNextPage()
          }
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            tab === 'saved' ? (
              <EmptyState
                icon="🔖"
                title="No saved sermons yet"
                subtitle="Open a sermon and tap the bookmark to save it for later."
                actionLabel="Browse sermons"
                onAction={() => setTab('all')}
              />
            ) : (
              <EmptyState icon="📖" title="No sermons yet" subtitle="Messages will appear here once posted." />
            )
          }
          ListFooterComponent={
            tab === 'all' && isFetchingNextPage ? (
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
    paddingBottom: Spacing.md,
    gap: 4,
    overflow: 'hidden',
  },
  heroArt: {
    position: 'absolute',
    right: -12,
    top: 8,
    opacity: 0.35,
  },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  tabBar: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.full,
    padding: 3,
    alignSelf: 'flex-start',
  },
  tab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    minHeight: 36,
    justifyContent: 'center',
    minWidth: 80,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.white },
  tabText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  tabTextActive: { color: Colors.purple },
});
