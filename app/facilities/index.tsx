import React from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { KlinkCard } from '../../src/components/common/KlinkCard';
import { MemberCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { facilitiesApi, Facility } from '../../src/api/facilities';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { PAGE_SIZE } from '../../src/utils/constants';
import { StaggerDelay } from '../../src/theme/animations';

const CONDITION_COLOR: Record<string, string> = {
  EXCELLENT: Colors.green,
  GOOD: Colors.blue,
  FAIR: Colors.gold,
  POOR: Colors.roseGold,
  NEEDS_REPAIR: Colors.red,
};

export default function FacilitiesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['facilities'],
      queryFn: ({ pageParam = 0 }) => facilitiesApi.list({ page: pageParam, size: PAGE_SIZE }),
      getNextPageParam: (last) =>
        last.number + 1 < last.totalPages ? last.number + 1 : undefined,
      initialPageParam: 0,
    });

  const facilities: Facility[] = data?.pages.flatMap((p) => p.content) ?? [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient colors={Gradients.darkWorship} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Facilities</Text>
        <Text style={styles.headerSub}>Church assets and properties</Text>
      </LinearGradient>

      {isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 5 }, (_, i) => <MemberCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={facilities}
          estimatedItemSize={100}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <FacilityCard facility={item} index={index} theme={theme} />}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />}
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No facilities recorded</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function FacilityCard({ facility, index, theme }: { facility: Facility; index: number; theme: any }) {
  const condColor = CONDITION_COLOR[facility.condition] ?? Colors.darkMuted;
  return (
    <ScrollReveal delay={index * StaggerDelay.list} style={styles.cardWrap}>
      <KlinkCard style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.typeIcon}>
            <Text style={styles.typeEmoji}>🏛</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.facilityName, { color: theme.text }]} numberOfLines={1}>
              {facility.name}
            </Text>
            <Text style={[styles.facilityType, { color: theme.textMuted }]}>
              {facility.facilityType.replace('_', ' ')}
            </Text>
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.condBadge, { backgroundColor: `${condColor}20` }]}>
              <Text style={[styles.condText, { color: condColor }]}>
                {facility.condition.replace('_', ' ')}
              </Text>
            </View>
            {!facility.isActive && (
              <Text style={[styles.inactiveText, { color: theme.textMuted }]}>Inactive</Text>
            )}
          </View>
        </View>
        {facility.description && (
          <Text style={[styles.desc, { color: theme.textSecondary }]} numberOfLines={2}>
            {facility.description}
          </Text>
        )}
      </KlinkCard>
    </ScrollReveal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.lg, gap: 4 },
  headerTitle: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.tight },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  cardWrap: { marginHorizontal: Spacing.pagePadding, marginBottom: Spacing.sm },
  card: {},
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  typeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(45,27,105,0.15)', alignItems: 'center', justifyContent: 'center' },
  typeEmoji: { fontSize: 20 },
  cardInfo: { flex: 1 },
  facilityName: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  facilityType: { fontSize: FontSize.caption, marginTop: 2, textTransform: 'capitalize' },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  condBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3 },
  condText: { fontSize: FontSize.caption, fontWeight: FontWeight.semiBold, textTransform: 'capitalize' },
  inactiveText: { fontSize: FontSize.micro },
  desc: { fontSize: FontSize.small, lineHeight: FontSize.small * 1.5, marginTop: Spacing.sm },
  empty: { padding: Spacing.xxxl, alignItems: 'center' },
  emptyText: { fontSize: FontSize.body },
});
