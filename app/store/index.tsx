import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Image as ExpoImage } from 'expo-image';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { KlinkToast } from '../../src/components/common/KlinkToast';
import { WatermarkBackground } from '../../src/components/common/WatermarkBackground';
import { SermonCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { storeApi, StoreItem, StorePayment } from '../../src/api/store';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import { formatCurrency, formatDate } from '../../src/utils/formatters';
import { PAGE_SIZE } from '../../src/utils/constants';

type Tab = 'shop' | 'purchases';

export default function StoreScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();
  const isManager = role === 'MANAGER';

  const [tab, setTab] = useState<Tab>('shop');
  const [buying, setBuying] = useState<StoreItem | null>(null);
  const [momoRef, setMomoRef] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ── Shop items ────────────────────────────────────────────────────────────
  const itemsQuery = useInfiniteQuery({
    queryKey: ['store-items'],
    queryFn: ({ pageParam = 0 }) => storeApi.listItems({ page: pageParam, size: PAGE_SIZE }),
    getNextPageParam: (last) => {
      if (!last || !Array.isArray(last.content)) return undefined;
      return (last.number ?? 0) + 1 < (last.totalPages ?? 0) ? (last.number ?? 0) + 1 : undefined;
    },
    initialPageParam: 0,
  });
  const items: StoreItem[] = (itemsQuery.data?.pages ?? [])
    .flatMap((p) => p?.content ?? [])
    .filter((i): i is StoreItem => Boolean(i?.id));

  // ── My purchases ──────────────────────────────────────────────────────────
  const purchasesQuery = useInfiniteQuery({
    queryKey: ['store-my-purchases'],
    queryFn: ({ pageParam = 0 }) => storeApi.myPurchases({ page: pageParam, size: PAGE_SIZE }),
    getNextPageParam: (last) => {
      if (!last || !Array.isArray(last.content)) return undefined;
      return (last.number ?? 0) + 1 < (last.totalPages ?? 0) ? (last.number ?? 0) + 1 : undefined;
    },
    initialPageParam: 0,
    enabled: tab === 'purchases',
  });
  const purchases: StorePayment[] = (purchasesQuery.data?.pages ?? [])
    .flatMap((p) => p?.content ?? [])
    .filter((p): p is StorePayment => Boolean(p?.id));

  // ── Buy flow — backend requires a MoMo reference (payment made via MoMo) ──
  const { mutate: buy, isPending: buyingNow } = useMutation({
    mutationFn: () => storeApi.buyItem({ itemId: buying!.id, momoReference: momoRef.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-items'] });
      queryClient.invalidateQueries({ queryKey: ['store-my-purchases'] });
      haptics.success();
      setBuying(null);
      setMomoRef('');
      setToast({ message: 'Purchase recorded — collect it at church', type: 'success' });
    },
    onError: (err: any) => {
      haptics.error();
      setToast({ message: err?.friendlyMessage ?? 'Could not complete the purchase', type: 'error' });
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header — rotating worship photos like every screen */}
      <WatermarkBackground overlayOpacity={0.62} overlayColor="#1A0533" style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Church Store</Text>
        <Text style={styles.headerSub}>Books, merch and materials from your church</Text>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['shop', 'purchases'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => { haptics.light(); setTab(t); }}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'shop' ? 'Shop' : 'My purchases'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </WatermarkBackground>

      {tab === 'shop' ? (
        itemsQuery.isLoading ? (
          <View style={{ paddingTop: Spacing.md }}>
            {Array.from({ length: 4 }, (_, i) => <SermonCardSkeleton key={i} />)}
          </View>
        ) : (
          <FlashList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ItemCard
                item={item}
                theme={theme}
                onBuy={() => { haptics.medium(); setBuying(item); }}
              />
            )}
            onEndReached={() =>
              itemsQuery.hasNextPage && !itemsQuery.isFetchingNextPage && itemsQuery.fetchNextPage()
            }
            onEndReachedThreshold={0.3}
            refreshControl={
              <RefreshControl refreshing={itemsQuery.isRefetching} onRefresh={itemsQuery.refetch} tintColor={Colors.gold} />
            }
            contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: 100 }}
            ListEmptyComponent={
              <EmptyState
                icon="🛍"
                title="The store is empty"
                subtitle={isManager ? 'Add the first item from the web/admin flow' : 'Items your church sells will appear here'}
              />
            }
          />
        )
      ) : purchasesQuery.isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 3 }, (_, i) => <SermonCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={purchases}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PurchaseRow payment={item} theme={theme} />}
          refreshControl={
            <RefreshControl refreshing={purchasesQuery.isRefetching} onRefresh={purchasesQuery.refetch} tintColor={Colors.gold} />
          }
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: 100 }}
          ListEmptyComponent={
            <EmptyState icon="🧾" title="No purchases yet" subtitle="Items you buy will show here until you collect them" />
          }
        />
      )}

      {/* Buy modal — asks for the MoMo reference (backend requires it) */}
      <Modal visible={!!buying} transparent animationType="fade" onRequestClose={() => setBuying(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />
            <Text style={styles.modalTitle}>{buying?.name}</Text>
            <Text style={styles.modalPrice}>{formatCurrency(buying?.price ?? 0)}</Text>
            <Text style={styles.modalHint}>
              Pay with Mobile Money to your church, then enter the transaction reference below to reserve the item.
            </Text>
            <KlinkInput label="MoMo reference" value={momoRef} onChangeText={setMomoRef} autoCapitalize="characters" maxLength={100} />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { haptics.light(); setBuying(null); setMomoRef(''); }}
                style={styles.modalCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.modalSubmit}>
                <KlinkButton
                  label={`Buy for ${formatCurrency(buying?.price ?? 0)}`}
                  onPress={() => momoRef.trim() && buy()}
                  disabled={!momoRef.trim() || buyingNow}
                  loading={buyingNow}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {toast && <KlinkToast message={toast.message} type={toast.type} visible onHide={() => setToast(null)} />}
    </View>
  );
}

function ItemCard({ item, theme, onBuy }: { item: StoreItem; theme: any; onBuy: () => void }) {
  const soldOut = item.status === 'SOLD_OUT' || item.quantity <= 0;
  return (
    <View style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      {item.photoUrl ? (
        <ExpoImage source={{ uri: item.photoUrl }} style={styles.itemPhoto} contentFit="cover" transition={200} cachePolicy="memory-disk" />
      ) : (
        <LinearGradient colors={Gradients.worship} style={styles.itemPhoto} />
      )}
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
        {item.description ? (
          <Text style={[styles.itemDesc, { color: theme.textMuted }]} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.itemFooter}>
          <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
          {soldOut ? (
            <View style={styles.soldOutBadge}><Text style={styles.soldOutText}>Sold out</Text></View>
          ) : (
            <TouchableOpacity onPress={onBuy} style={styles.buyBtn} accessibilityRole="button" accessibilityLabel={`Buy ${item.name}`}>
              <LinearGradient colors={Gradients.golden} style={styles.buyBtnGradient}>
                <Text style={styles.buyBtnText}>Buy</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

function PurchaseRow({ payment, theme }: { payment: StorePayment; theme: any }) {
  const collected = payment.collectionStatus === 'COLLECTED';
  return (
    <View style={[styles.purchaseRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>{payment.itemName ?? 'Item'}</Text>
        <Text style={[styles.itemDesc, { color: theme.textMuted }]} numberOfLines={1}>
          {formatDate(payment.datePaid)} · {formatCurrency(payment.amount)}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: collected ? 'rgba(34,197,94,0.15)' : 'rgba(244,164,41,0.15)' }]}>
        <Text style={[styles.statusText, { color: collected ? Colors.success : Colors.gold }]}>
          {collected ? 'Collected' : 'Awaiting pickup'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.md, gap: 4, overflow: 'hidden' },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  headerTitle: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.tight },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  tabRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  tabBtn: {
    paddingHorizontal: Spacing.md,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tabBtnActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  tabText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  tabTextActive: { color: '#1A0A2E' },

  itemCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.pagePadding,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemPhoto: { width: 96, height: 108 },
  itemInfo: { flex: 1, padding: Spacing.md, gap: 4, justifyContent: 'center' },
  itemName: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  itemDesc: { fontSize: FontSize.caption, lineHeight: FontSize.caption * 1.5 },
  itemFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  itemPrice: { color: Colors.gold, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  buyBtn: { borderRadius: 999, overflow: 'hidden' },
  buyBtnGradient: { paddingHorizontal: Spacing.lg, minHeight: 40, justifyContent: 'center', alignItems: 'center' },
  buyBtnText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.small },
  soldOutBadge: {
    backgroundColor: 'rgba(220,38,38,0.15)',
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    minHeight: 32,
    justifyContent: 'center',
  },
  soldOutText: { color: Colors.red, fontSize: FontSize.caption, fontWeight: FontWeight.bold },

  purchaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.pagePadding,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
  },
  statusBadge: { borderRadius: 999, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  statusText: { fontSize: FontSize.caption, fontWeight: FontWeight.bold },

  modalBackdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: Spacing.pagePadding },
  modalCard: { borderRadius: BorderRadius.xxl, overflow: 'hidden', padding: Spacing.lg, gap: Spacing.sm },
  modalGlass: {
    borderRadius: BorderRadius.xxl,
    backgroundColor: 'rgba(26,19,64,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  modalTitle: { color: Colors.white, fontSize: FontSize.h4, fontWeight: FontWeight.bold },
  modalPrice: { color: Colors.gold, fontSize: FontSize.h3, fontWeight: FontWeight.bold },
  modalHint: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small, lineHeight: 20, marginBottom: Spacing.xs },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  modalCancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  modalCancelText: { color: Colors.darkMuted, fontSize: FontSize.body, fontWeight: FontWeight.medium },
  modalSubmit: { flex: 1 },
});
