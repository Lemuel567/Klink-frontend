import React, { useMemo } from 'react';
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { KlinkCard } from '../../src/components/common/KlinkCard';
import { AnnouncementSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { announcementsApi, Announcement } from '../../src/api/announcements';
import { useNotificationStore } from '../../src/store/notificationStore';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { formatRelativeTime } from '../../src/utils/formatters';

// One merged feed: locally received notifications + announcements addressed to me.
interface FeedItem {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  source: 'local' | 'announcement';
}

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  const { notifications, unreadCount, markRead, markAllRead } = useNotificationStore();

  const {
    data: myAnnouncements,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['announcements-my-inbox'],
    queryFn: () => announcementsApi.listMy({ size: 30 }),
  });

  const feed: FeedItem[] = useMemo(() => {
    const local: FeedItem[] = notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      timestamp: n.timestamp,
      read: n.read,
      source: 'local' as const,
    }));
    const fromAnnouncements: FeedItem[] = (myAnnouncements?.content ?? []).map((a: Announcement) => ({
      id: `ann_${a.id}`,
      title: a.title,
      body: a.body,
      timestamp: new Date(a.createdAt).getTime(),
      read: true, // announcements have no per-member read state yet (backend gap)
      source: 'announcement' as const,
    }));
    return [...local, ...fromAnnouncements].sort((x, y) => y.timestamp - x.timestamp);
  }, [notifications, myAnnouncements]);

  const handlePress = (item: FeedItem) => {
    haptics.light();
    if (item.source === 'local' && !item.read) {
      markRead(item.id);
    }
    if (item.source === 'announcement') {
      router.push('/announcements');
    }
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
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSub}>
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={() => { haptics.light(); markAllRead(); }}
              style={styles.markAllBtn}
              accessibilityRole="button"
              accessibilityLabel="Mark all notifications as read"
            >
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 6 }, (_, i) => <AnnouncementSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={feed}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <KlinkCard onPress={() => handlePress(item)} style={styles.card}>
              <View style={styles.cardRow}>
                {!item.read && <View style={styles.unreadDot} />}
                <View style={styles.cardBody}>
                  <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.cardText, { color: theme.textSecondary }]} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <Text style={[styles.cardMeta, { color: theme.textMuted }]}>
                    {formatRelativeTime(new Date(item.timestamp).toISOString())}
                    {item.source === 'announcement' ? ' · Announcement' : ''}
                  </Text>
                </View>
              </View>
            </KlinkCard>
          )}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />
          }
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: 60 }}
          ListEmptyComponent={
            <EmptyState
              icon="🔔"
              title="Nothing here yet"
              subtitle="Announcements addressed to you and app notifications will appear here."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.md },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerText: { flex: 1, gap: 4 },
  headerTitle: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  markAllBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  markAllText: { color: Colors.white, fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  card: { marginHorizontal: Spacing.pagePadding, marginBottom: Spacing.sm },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
    marginTop: 6,
  },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  cardText: { fontSize: FontSize.small, lineHeight: FontSize.small * 1.5 },
  cardMeta: { fontSize: FontSize.caption },
});
