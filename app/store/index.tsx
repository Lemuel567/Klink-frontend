import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { mediaApi } from '../../src/api/media';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Image as ExpoImage } from 'expo-image';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { KlinkToast } from '../../src/components/common/KlinkToast';
import { WatermarkBackground } from '../../src/components/common/WatermarkBackground';
import { SermonCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { storeApi, StoreItem, StorePayment } from '../../src/api/store';
import { membersApi, Member } from '../../src/api/members';
import { useDebounce } from '../../src/hooks/useDebounce';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import { formatCurrency, formatDate } from '../../src/utils/formatters';
import { PAGE_SIZE } from '../../src/utils/constants';

type Tab = 'shop' | 'purchases' | 'payments';

export default function StoreScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();
  const isManager = role === 'MANAGER';
  const isFinSec = role === 'FINANCIAL_SECRETARY';
  // Backend: GET /store/payments = FinSec/Pastor/Elder; collect = Manager
  const canSeePayments = ['FINANCIAL_SECRETARY', 'PASTOR', 'ELDER', 'MANAGER'].includes(role ?? '');

  const [tab, setTab] = useState<Tab>('shop');
  const [buying, setBuying] = useState<StoreItem | null>(null);
  const [momoRef, setMomoRef] = useState('');
  // FinSec manual-sale: which member the sale is recorded for
  const [buyerSearch, setBuyerSearch] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState<Pick<Member, 'id' | 'fullName'> | null>(null);
  const debouncedBuyerSearch = useDebounce(buyerSearch, 400);
  const { data: buyerResults, isFetching: searchingBuyers } = useQuery({
    queryKey: ['store-buyer-search', debouncedBuyerSearch],
    queryFn: () => membersApi.list({ search: debouncedBuyerSearch, size: 8 }),
    enabled: isFinSec && !!buying && !selectedBuyer && debouncedBuyerSearch.length >= 2,
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Manager add-item form
  const [adding, setAdding] = useState(false);
  const [itName, setItName] = useState('');
  const [itDesc, setItDesc] = useState('');
  const [itPrice, setItPrice] = useState('');
  const [itQty, setItQty] = useState('');
  const [itCategory, setItCategory] = useState('');
  const [itPhotos, setItPhotos] = useState<string[]>([]); // uploaded URLs
  const [uploadingItemPhoto, setUploadingItemPhoto] = useState(false);

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

  // ── All payments (FinSec / Pastor / Elder / Manager) ─────────────────────
  const paymentsQuery = useInfiniteQuery({
    queryKey: ['store-payments'],
    queryFn: ({ pageParam = 0 }) => storeApi.listPayments({ page: pageParam, size: PAGE_SIZE }),
    getNextPageParam: (last) => {
      if (!last || !Array.isArray(last.content)) return undefined;
      return (last.number ?? 0) + 1 < (last.totalPages ?? 0) ? (last.number ?? 0) + 1 : undefined;
    },
    initialPageParam: 0,
    enabled: tab === 'payments' && canSeePayments,
  });
  const allPayments: StorePayment[] = (paymentsQuery.data?.pages ?? [])
    .flatMap((p) => p?.content ?? [])
    .filter((p): p is StorePayment => Boolean(p?.id));

  const { mutate: collect, isPending: collecting } = useMutation({
    mutationFn: (paymentId: string) => storeApi.collectPayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-payments'] });
      haptics.success();
      setToast({ message: 'Marked as collected', type: 'success' });
    },
    onError: (err: any) => {
      haptics.error();
      setToast({ message: err?.friendlyMessage ?? 'Could not mark as collected', type: 'error' });
    },
  });

  // ── Manager add-item flow — multiple photos per item ─────────────────────
  const addItemPhoto = async () => {
    haptics.light();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    try {
      setUploadingItemPhoto(true);
      const uri = result.assets[0].uri;
      const name = uri.split('/').pop() ?? 'item.jpg';
      const ext = name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const uploaded = await mediaApi.upload(
        { uri, name, type: ext === 'png' ? 'image/png' : 'image/jpeg' },
        'store',
      );
      setItPhotos((prev) => [...prev, uploaded.imageUrl]);
      haptics.success();
    } catch (err: any) {
      haptics.error();
      setToast({ message: err?.friendlyMessage ?? 'Photo upload failed', type: 'error' });
    } finally {
      setUploadingItemPhoto(false);
    }
  };

  const { mutate: createItem, isPending: creatingItem } = useMutation({
    mutationFn: () =>
      storeApi.createItemJson({
        name: itName.trim(),
        description: itDesc.trim() || undefined,
        price: parseFloat(itPrice),
        quantity: parseInt(itQty, 10),
        category: itCategory.trim() || undefined,
        photoUrls: itPhotos.length ? itPhotos : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-items'] });
      haptics.success();
      setAdding(false);
      setItName(''); setItDesc(''); setItPrice(''); setItQty(''); setItCategory(''); setItPhotos([]);
      setToast({ message: 'Item added to the store', type: 'success' });
    },
    onError: (err: any) => {
      haptics.error();
      setToast({ message: err?.friendlyMessage ?? 'Could not add the item', type: 'error' });
    },
  });
  const itemValid =
    itName.trim().length > 0 &&
    !isNaN(parseFloat(itPrice)) && parseFloat(itPrice) > 0 &&
    !isNaN(parseInt(itQty, 10)) && parseInt(itQty, 10) >= 0;

  // ── Buy flow — backend requires a MoMo reference (payment made via MoMo) ──
  const { mutate: buy, isPending: buyingNow } = useMutation({
    mutationFn: () =>
      storeApi.buyItem({
        itemId: buying!.id,
        momoReference: momoRef.trim() || undefined,
        memberId: isFinSec ? selectedBuyer?.id : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-items'] });
      queryClient.invalidateQueries({ queryKey: ['store-my-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['store-payments'] });
      haptics.success();
      setBuying(null);
      setMomoRef('');
      setSelectedBuyer(null);
      setBuyerSearch('');
      setToast({
        message: isFinSec ? 'Sale recorded' : 'Purchase recorded — collect it at church',
        type: 'success',
      });
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

        {/* Tabs — All payments only for FinSec / Pastor / Elder / Manager */}
        <View style={styles.tabRow}>
          {((canSeePayments ? ['shop', 'purchases', 'payments'] : ['shop', 'purchases']) as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => { haptics.light(); setTab(t); }}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'shop' ? 'Shop' : t === 'purchases' ? 'My purchases' : 'All payments'}
              </Text>
            </TouchableOpacity>
          ))}
          {isManager && (
            <TouchableOpacity
              onPress={() => { haptics.medium(); setAdding(true); }}
              style={[styles.tabBtn, styles.addItemBtn]}
              accessibilityRole="button"
              accessibilityLabel="Add a store item"
            >
              <Text style={styles.addItemText}>+ Item</Text>
            </TouchableOpacity>
          )}
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
                buyLabel={isFinSec ? 'Record sale' : 'Buy'}
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
                subtitle={isManager ? 'Tap "+ Item" above to add the first item' : 'Items your church sells will appear here'}
              />
            }
          />
        )
      ) : tab === 'purchases' ? (
        purchasesQuery.isLoading ? (
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
        )
      ) : paymentsQuery.isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 3 }, (_, i) => <SermonCardSkeleton key={i} />)}
        </View>
      ) : (
        /* ALL payments — the secretary's record of every store sale */
        <FlashList
          data={allPayments}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PaymentRecordRow
              payment={item}
              theme={theme}
              canCollect={isManager}
              collecting={collecting}
              onCollect={() => collect(item.id)}
            />
          )}
          onEndReached={() =>
            paymentsQuery.hasNextPage && !paymentsQuery.isFetchingNextPage && paymentsQuery.fetchNextPage()
          }
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={paymentsQuery.isRefetching} onRefresh={paymentsQuery.refetch} tintColor={Colors.gold} />
          }
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: 100 }}
          ListEmptyComponent={
            <EmptyState icon="📒" title="No store payments yet" subtitle="Every purchase members make appears here automatically" />
          }
        />
      )}

      {/* Add-item modal — Manager only; multiple photos per item */}
      <Modal visible={adding} transparent animationType="fade" onRequestClose={() => setAdding(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />
            <Text style={styles.modalTitle}>Add store item</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ maxHeight: 430 }}>
              <KlinkInput label="Item name" value={itName} onChangeText={setItName} maxLength={120} />
              <KlinkInput label="Description (optional)" value={itDesc} onChangeText={setItDesc} multiline numberOfLines={3} maxLength={1000} />
              <KlinkInput label="Price (GHS)" value={itPrice} onChangeText={setItPrice} keyboardType="decimal-pad" />
              <KlinkInput label="Quantity in stock" value={itQty} onChangeText={setItQty} keyboardType="number-pad" />
              <KlinkInput label="Category (optional)" value={itCategory} onChangeText={setItCategory} maxLength={60} />

              {/* Photos — add as many as needed; first one is the cover */}
              <Text style={styles.photosLabel}>PHOTOS ({itPhotos.length}) — first is the cover</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                {itPhotos.map((url, i) => (
                  <TouchableOpacity
                    key={url}
                    onLongPress={() => setItPhotos((prev) => prev.filter((u) => u !== url))}
                    accessibilityLabel={`Photo ${i + 1} — long press to remove`}
                  >
                    <ExpoImage source={{ uri: url }} style={styles.photoThumb} contentFit="cover" />
                    {i === 0 && <Text style={styles.coverTag}>COVER</Text>}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={addItemPhoto}
                  disabled={uploadingItemPhoto}
                  style={styles.addPhotoBox}
                  accessibilityRole="button"
                  accessibilityLabel="Add a photo"
                >
                  {uploadingItemPhoto
                    ? <ActivityIndicator color={Colors.gold} />
                    : <Text style={styles.addPhotoPlus}>＋</Text>}
                </TouchableOpacity>
              </ScrollView>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { haptics.light(); setAdding(false); }}
                style={styles.modalCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.modalSubmit}>
                <KlinkButton
                  label="Add item"
                  onPress={() => itemValid && createItem()}
                  disabled={!itemValid || creatingItem || uploadingItemPhoto}
                  loading={creatingItem}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Buy modal — asks for the MoMo reference (backend requires it) */}
      <Modal visible={!!buying} transparent animationType="fade" onRequestClose={() => setBuying(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />
            {/* All pictures of the item */}
            {(buying?.photoUrls?.length ?? 0) > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                {buying!.photoUrls!.map((url) => (
                  <ExpoImage key={url} source={{ uri: url }} style={styles.buyPhoto} contentFit="cover" />
                ))}
              </ScrollView>
            )}
            <Text style={styles.modalTitle}>{buying?.name}</Text>
            <Text style={styles.modalPrice}>{formatCurrency(buying?.price ?? 0)}</Text>
            <Text style={styles.modalStock}>{buying?.quantity ?? 0} in stock</Text>
            <Text style={styles.modalHint}>
              {isFinSec
                ? 'Record an offline sale (cash / MoMo at the desk) — select the member who bought it. Stock is subtracted automatically.'
                : 'Pay with Mobile Money to your church, then enter the transaction reference below to reserve the item.'}
            </Text>

            {/* FinSec: who bought it? */}
            {isFinSec && (
              selectedBuyer ? (
                <TouchableOpacity
                  style={styles.buyerChip}
                  onPress={() => { haptics.light(); setSelectedBuyer(null); setBuyerSearch(''); }}
                  accessibilityRole="button"
                  accessibilityLabel={`Buyer ${selectedBuyer.fullName}. Tap to change.`}
                >
                  <Text style={styles.buyerChipName} numberOfLines={1}>{selectedBuyer.fullName}</Text>
                  <Text style={styles.buyerChipChange}>Change</Text>
                </TouchableOpacity>
              ) : (
                <View>
                  <KlinkInput
                    label="Search member by name..."
                    value={buyerSearch}
                    onChangeText={setBuyerSearch}
                    autoCapitalize="words"
                    containerStyle={{ marginBottom: 4 }}
                  />
                  {searchingBuyers && <ActivityIndicator color={Colors.gold} />}
                  {(buyerResults?.content ?? []).map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => {
                        haptics.light();
                        setSelectedBuyer({ id: m.id, fullName: m.fullName });
                        setBuyerSearch('');
                      }}
                      style={styles.buyerRow}
                      accessibilityRole="button"
                      accessibilityLabel={m.fullName}
                    >
                      <Text style={styles.buyerRowName} numberOfLines={1}>{m.fullName}</Text>
                      <Text style={styles.buyerRowSub} numberOfLines={1}>{m.phone ?? ''}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )
            )}

            <KlinkInput
              label={isFinSec ? 'Reference (optional)' : 'MoMo reference'}
              value={momoRef}
              onChangeText={setMomoRef}
              autoCapitalize="characters"
              maxLength={100}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  haptics.light();
                  setBuying(null);
                  setMomoRef('');
                  setSelectedBuyer(null);
                  setBuyerSearch('');
                }}
                style={styles.modalCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.modalSubmit}>
                <KlinkButton
                  label={
                    isFinSec
                      ? `Record sale — ${formatCurrency(buying?.price ?? 0)}`
                      : `Buy for ${formatCurrency(buying?.price ?? 0)}`
                  }
                  onPress={() => (isFinSec ? !!selectedBuyer : !!momoRef.trim()) && buy()}
                  disabled={(isFinSec ? !selectedBuyer : !momoRef.trim()) || buyingNow}
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

function ItemCard({ item, theme, onBuy, buyLabel = 'Buy' }: { item: StoreItem; theme: any; onBuy: () => void; buyLabel?: string }) {
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
          <View>
            <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
            {!soldOut && (
              <Text style={styles.stockText}>{item.quantity} left</Text>
            )}
          </View>
          {soldOut ? (
            <View style={styles.soldOutBadge}><Text style={styles.soldOutText}>Sold out</Text></View>
          ) : (
            <TouchableOpacity onPress={onBuy} style={styles.buyBtn} accessibilityRole="button" accessibilityLabel={`Buy ${item.name}`}>
              <LinearGradient colors={Gradients.golden} style={styles.buyBtnGradient}>
                <Text style={styles.buyBtnText}>{buyLabel}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

/** One row in the secretary's ALL-payments record; Manager can mark collected. */
function PaymentRecordRow({
  payment,
  theme,
  canCollect,
  collecting,
  onCollect,
}: {
  payment: StorePayment;
  theme: any;
  canCollect: boolean;
  collecting: boolean;
  onCollect: () => void;
}) {
  const collected = payment.collectionStatus === 'COLLECTED';
  return (
    <View style={[styles.purchaseRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
          {payment.memberName ?? 'Member'} — {payment.itemName ?? 'Item'}
        </Text>
        <Text style={[styles.itemDesc, { color: theme.textMuted }]} numberOfLines={1}>
          {formatDate(payment.datePaid)} · {formatCurrency(payment.amount)}
        </Text>
      </View>
      {collected ? (
        <View style={[styles.statusBadge, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
          <Text style={[styles.statusText, { color: Colors.success }]}>Collected</Text>
        </View>
      ) : canCollect ? (
        <TouchableOpacity
          onPress={onCollect}
          disabled={collecting}
          style={styles.collectBtn}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${payment.itemName ?? 'item'} as collected`}
        >
          <Text style={styles.collectBtnText}>Collect</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.statusBadge, { backgroundColor: 'rgba(244,164,41,0.15)' }]}>
          <Text style={[styles.statusText, { color: Colors.gold }]}>Awaiting</Text>
        </View>
      )}
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
  stockText: { color: 'rgba(255,255,255,0.55)', fontSize: FontSize.caption, marginTop: 1 },
  modalStock: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small, marginTop: -6 },
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
  addItemBtn: { backgroundColor: 'rgba(244,164,41,0.15)', borderColor: Colors.gold },
  addItemText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.bold },
  collectBtn: {
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    minHeight: 38,
    justifyContent: 'center',
  },
  collectBtnText: { color: Colors.gold, fontSize: FontSize.caption, fontWeight: FontWeight.bold },
  photosLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: FontWeight.semiBold,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  photoRow: { gap: Spacing.sm, paddingVertical: 4 },
  photoThumb: { width: 72, height: 72, borderRadius: 12 },
  buyPhoto: { width: 110, height: 84, borderRadius: 12 },
  coverTag: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    color: Colors.gold,
    fontSize: 8,
    fontWeight: FontWeight.bold,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  addPhotoBox: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(244,164,41,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoPlus: { color: Colors.gold, fontSize: 26 },
  buyerChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(244,164,41,0.15)',
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
    marginBottom: Spacing.xs,
  },
  buyerChipName: { color: Colors.white, fontSize: FontSize.body, fontWeight: FontWeight.medium, flex: 1 },
  buyerChipChange: { color: Colors.gold, fontSize: FontSize.small },
  buyerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    minHeight: 44,
  },
  buyerRowName: { color: Colors.white, fontSize: FontSize.small, fontWeight: FontWeight.medium, flex: 1 },
  buyerRowSub: { color: Colors.darkMuted, fontSize: FontSize.caption },

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
