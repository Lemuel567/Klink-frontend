import React, { useState } from 'react';
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AnnouncementCard } from '../../src/components/screens/AnnouncementCard';
import { AnnouncementSkeleton } from '../../src/components/common/KlinkSkeleton';
import { announcementsApi, Announcement } from '../../src/api/announcements';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import { PAGE_SIZE } from '../../src/utils/constants';

type Tab = 'all' | 'my';

const PRIVILEGED = ['PASTOR', 'ELDER', 'MANAGER'];

export default function AnnouncementsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const [activeTab, setActiveTab] = useState<Tab>('all');

  const isPrivileged = role ? PRIVILEGED.includes(role) : false;

  const allQuery = useInfiniteQuery({
    queryKey: ['announcements-all'],
    queryFn: ({ pageParam = 0 }) => announcementsApi.list({ page: pageParam, size: PAGE_SIZE }),
    getNextPageParam: (last) => last.number + 1 < last.totalPages ? last.number + 1 : undefined,
    initialPageParam: 0,
  });

  const myQuery = useInfiniteQuery({
    queryKey: ['announcements-my'],
    queryFn: ({ pageParam = 0 }) => announcementsApi.listMy({ page: pageParam, size: PAGE_SIZE }),
    getNextPageParam: (last) => last.number + 1 < last.totalPages ? last.number + 1 : undefined,
    initialPageParam: 0,
  });

  const activeQuery = activeTab === 'all' ? allQuery : myQuery;
  const announcements: Announcement[] = activeQuery.data?.pages.flatMap((p) => p.content) ?? [];

  const handleTabPress = (tab: Tab) => {
    haptics.light();
    setActiveTab(tab);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient colors={Gradients.worship} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcements</Text>
        <Text style={styles.headerSub}>Stay up to date with your church</Text>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {(['all', 'my'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => handleTabPress(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === tab }}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'all' ? 'All' : 'For Me'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {activeQuery.isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 6 }, (_, i) => <AnnouncementSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={announcements}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <AnnouncementCard announcement={item} index={index} />}
          onEndReached={() =>
            activeQuery.hasNextPage && !activeQuery.isFetchingNextPage && activeQuery.fetchNextPage()
          }
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={activeQuery.isRefetching}
              onRefresh={activeQuery.refetch}
              tintColor={Colors.gold}
            />
          }
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: isPrivileged ? 120 : 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                {activeTab === 'my'
                  ? 'No announcements addressed to you yet'
                  : 'No announcements yet'}
              </Text>
            </View>
          }
        />
      )}

      {/* Create FAB — only for PASTOR, ELDER, MANAGER */}
      {isPrivileged && (
        <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            onPress={() => { haptics.medium(); router.push('/announcements/new'); }}
            style={styles.fab}
            accessibilityRole="button"
            accessibilityLabel="Create new announcement"
          >
            <LinearGradient colors={Gradients.glory} style={styles.fabGradient}>
              <Text style={styles.fabText}>+ New</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.sm, gap: 4 },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  headerTitle: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold },
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
  empty: { padding: Spacing.xxxl, alignItems: 'center' },
  emptyText: { fontSize: FontSize.body, textAlign: 'center' },
  fabContainer: { position: 'absolute', right: Spacing.pagePadding, bottom: 0 },
  fab: { borderRadius: BorderRadius.full, overflow: 'hidden' },
  fabGradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.body },
});
