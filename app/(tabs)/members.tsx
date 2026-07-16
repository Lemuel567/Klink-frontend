import React, { useState, useCallback } from 'react';
import { RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MemberCard } from '../../src/components/screens/MemberCard';
import { WatermarkBackground } from '../../src/components/common/WatermarkBackground';
import { ScreenPhotos } from '../../src/utils/worshipImages';
import { MemberCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { membersApi, Member } from '../../src/api/members';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useDebounce } from '../../src/hooks/useDebounce';
import { useRole } from '../../src/store/authStore';
import { PAGE_SIZE } from '../../src/utils/constants';
import { LinearGradient } from 'expo-linear-gradient';

// Leaders can register members WITHOUT smartphones (QR card + SMS, no app account)
const CAN_REGISTER = ['PASTOR', 'ELDER', 'MANAGER'];

export default function MembersScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const role = useRole();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const canRegister = role ? CAN_REGISTER.includes(role) : false;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['members', debouncedSearch],
    queryFn: ({ pageParam = 0 }) =>
      membersApi.list({ page: pageParam, size: PAGE_SIZE, search: debouncedSearch || undefined }),
    getNextPageParam: (last) =>
      last.number + 1 < last.totalPages ? last.number + 1 : undefined,
    initialPageParam: 0,
  });

  const members: Member[] = data?.pages.flatMap((p) => p.content) ?? [];

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage]);

  const renderSkeleton = () => (
    <View>
      {Array.from({ length: 8 }, (_, i) => <MemberCardSkeleton key={i} />)}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header — arena crowd photo (crowd-1) */}
      <WatermarkBackground
        imageSource={ScreenPhotos.members}
        overlayOpacity={0.62}
        overlayColor="#1A0533"
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Members</Text>
            <Text style={styles.headerSub}>{data?.pages[0]?.totalElements ?? 0} members</Text>
          </View>
          {canRegister && (
            <TouchableOpacity
              onPress={() => router.push('/members/register')}
              style={styles.registerBtn}
              accessibilityRole="button"
              accessibilityLabel="Register a member without a smartphone"
            >
              <Text style={styles.registerBtnText}>+ Register</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <TextInput
            style={[styles.search, { color: Colors.white }]}
            placeholder="Search members..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            accessibilityLabel="Search members"
          />
        </View>
      </WatermarkBackground>

      {/* List */}
      {isLoading ? (
        renderSkeleton()
      ) : (
        <FlashList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <MemberCard
              member={item}
              index={index}
              onPress={() => router.push(`/members/${item.id}`)}
            />
          )}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <EmptyState
              icon="👥"
              title={debouncedSearch ? 'No members match your search' : 'No members yet'}
              subtitle={debouncedSearch ? 'Try a different name or clear the search' : 'Members who join with your church code will appear here'}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View>{Array.from({ length: 3 }, (_, i) => <MemberCardSkeleton key={i} />)}</View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.gold}
            />
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
  headerSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.small,
    marginBottom: Spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  registerBtn: {
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    minHeight: 40,
    justifyContent: 'center',
  },
  registerBtnText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.bold },
  searchWrap: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    height: 44,
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  search: { fontSize: FontSize.body, flex: 1 },
});
