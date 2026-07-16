import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { KlinkCard } from '../../src/components/common/KlinkCard';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { AnnouncementSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { pledgesApi, Pledge } from '../../src/api/pledges';
import { membersApi, Member } from '../../src/api/members';
import { useDebounce } from '../../src/hooks/useDebounce';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import { formatCurrency } from '../../src/utils/formatters';
import { StaggerDelay } from '../../src/theme/animations';
import { PAGE_SIZE } from '../../src/utils/constants';

// Backend rules: record pledge + record payment = FinSec only;
// "all pledges" view = FinSec / Pastor / Elder; everyone sees their own.
const CAN_VIEW_ALL = ['FINANCIAL_SECRETARY', 'PASTOR', 'ELDER'];

const STATUS_META: Record<Pledge['status'], { label: string; color: string }> = {
  UNPAID: { label: 'Unpaid', color: Colors.roseGold },
  PARTIALLY_PAID: { label: 'Partly paid', color: Colors.gold },
  PAID: { label: 'Paid', color: Colors.green },
};

type Tab = 'mine' | 'all';

export default function PledgesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();

  const canViewAll = role ? CAN_VIEW_ALL.includes(role) : false;
  const isFinSec = role === 'FINANCIAL_SECRETARY';

  const [tab, setTab] = useState<Tab>(canViewAll ? 'all' : 'mine');

  // New-pledge modal (FinSec)
  const [composing, setComposing] = useState(false);
  const [pledgeMember, setPledgeMember] = useState<Member | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const debouncedSearch = useDebounce(memberSearch, 350);

  // Record-payment modal (FinSec)
  const [paying, setPaying] = useState<Pledge | null>(null);
  const [payAmount, setPayAmount] = useState('');

  const query = useInfiniteQuery({
    queryKey: ['pledges', tab],
    queryFn: ({ pageParam = 0 }) =>
      tab === 'all' && canViewAll
        ? pledgesApi.getAll({ page: pageParam, size: PAGE_SIZE })
        : pledgesApi.getMe({ page: pageParam, size: PAGE_SIZE }),
    getNextPageParam: (last) => (last.number + 1 < last.totalPages ? last.number + 1 : undefined),
    initialPageParam: 0,
  });

  const pledges: Pledge[] = query.data?.pages.flatMap((p) => p.content) ?? [];

  const { data: memberResults } = useQuery({
    queryKey: ['members', 'pledge-search', debouncedSearch],
    queryFn: () => membersApi.list({ search: debouncedSearch, size: 8 }),
    enabled: composing && !pledgeMember && debouncedSearch.length >= 2,
  });

  const { mutate: createPledge, isPending: creating } = useMutation({
    mutationFn: () =>
      pledgesApi.record({
        memberId: pledgeMember!.id,
        amount: parseFloat(amount),
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pledges'] });
      haptics.success();
      setComposing(false);
      setPledgeMember(null);
      setMemberSearch('');
      setAmount('');
      setDescription('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not record the pledge.');
      haptics.error();
    },
  });

  const { mutate: recordPayment, isPending: payingNow } = useMutation({
    mutationFn: () =>
      pledgesApi.pay(paying!.id, { amount: parseFloat(payAmount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pledges'] });
      haptics.success();
      setPaying(null);
      setPayAmount('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not record the payment.');
      haptics.error();
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient colors={Gradients.darkWorship} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pledges</Text>
        <Text style={styles.headerSub}>Promises made to the work of God</Text>

        {canViewAll && (
          <View style={styles.tabBar}>
            {(['all', 'mine'] as Tab[]).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => { haptics.light(); setTab(t); }}
                style={[styles.tab, tab === t && styles.tabActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t }}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'all' ? 'All pledges' : 'My pledges'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </LinearGradient>

      {query.isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 5 }, (_, i) => <AnnouncementSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={pledges}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <PledgeCard
              pledge={item}
              index={index}
              theme={theme}
              showMember={tab === 'all'}
              onRecordPayment={
                isFinSec && item.status !== 'PAID'
                  ? () => { haptics.light(); setPaying(item); setPayAmount(''); }
                  : undefined
              }
            />
          )}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={Colors.gold} />
          }
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: isFinSec ? 120 : 100 }}
          ListEmptyComponent={
            <EmptyState
              icon="🤝"
              title={tab === 'all' ? 'No pledges recorded' : 'You have no pledges'}
              subtitle={
                isFinSec
                  ? 'Record a pledge when a member commits an amount.'
                  : 'Pledges recorded for you will appear here.'
              }
              actionLabel={isFinSec ? '+ New pledge' : undefined}
              onAction={isFinSec ? () => setComposing(true) : undefined}
            />
          }
        />
      )}

      {/* New pledge FAB — FinSec only */}
      {isFinSec && (
        <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            onPress={() => { haptics.medium(); setComposing(true); }}
            style={styles.fab}
            accessibilityRole="button"
            accessibilityLabel="Record a new pledge"
          >
            <LinearGradient colors={Gradients.glory} style={styles.fabGradient}>
              <Text style={styles.fabText}>+ New pledge</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* New-pledge modal */}
      <Modal visible={composing} transparent animationType="fade" onRequestClose={() => setComposing(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />
            <Text style={styles.modalTitle}>New pledge</Text>

            {pledgeMember ? (
              <View style={styles.pickedRow}>
                <Text style={styles.pickedName} numberOfLines={1}>{pledgeMember.fullName}</Text>
                <TouchableOpacity
                  onPress={() => { haptics.light(); setPledgeMember(null); setMemberSearch(''); }}
                  style={styles.pickedClear}
                  accessibilityRole="button"
                  accessibilityLabel="Change member"
                >
                  <Text style={styles.pickedClearText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TextInput
                  value={memberSearch}
                  onChangeText={setMemberSearch}
                  placeholder="Search member by name or phone…"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={styles.searchInput}
                  selectionColor={Colors.gold}
                  autoCapitalize="none"
                />
                {(memberResults?.content?.length ?? 0) > 0 && (
                  <View style={styles.results}>
                    {memberResults!.content.map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => { haptics.light(); setPledgeMember(m); }}
                        style={styles.resultRow}
                        accessibilityRole="button"
                        accessibilityLabel={m.fullName}
                      >
                        <Text style={styles.resultName} numberOfLines={1}>{m.fullName}</Text>
                        {m.phone ? <Text style={styles.resultPhone}>{m.phone}</Text> : null}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            <Text style={styles.amountLabel}>PLEDGED AMOUNT (GHS)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.3)"
              style={styles.amountInput}
              keyboardType="decimal-pad"
              maxLength={12}
              selectionColor={Colors.gold}
            />

            <KlinkInput
              label="Description (optional)"
              value={description}
              onChangeText={setDescription}
              maxLength={500}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { haptics.light(); setComposing(false); }}
                style={styles.modalCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <KlinkButton
                  label="Record Pledge"
                  onPress={() => {
                    if (pledgeMember && parseFloat(amount) > 0) createPledge();
                  }}
                  disabled={!pledgeMember || !(parseFloat(amount) > 0) || creating}
                  loading={creating}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Record-payment modal */}
      <Modal visible={!!paying} transparent animationType="fade" onRequestClose={() => setPaying(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />
            <Text style={styles.modalTitle}>Record payment</Text>
            {paying && (
              <Text style={styles.modalSub}>
                {paying.memberName} · {formatCurrency(paying.amountPaid)} of {formatCurrency(paying.amount)} paid
              </Text>
            )}

            <Text style={styles.amountLabel}>PAYMENT AMOUNT (GHS)</Text>
            <TextInput
              value={payAmount}
              onChangeText={setPayAmount}
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.3)"
              style={styles.amountInput}
              keyboardType="decimal-pad"
              maxLength={12}
              selectionColor={Colors.gold}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { haptics.light(); setPaying(null); }}
                style={styles.modalCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <KlinkButton
                  label="Record Payment"
                  onPress={() => { if (parseFloat(payAmount) > 0) recordPayment(); }}
                  disabled={!(parseFloat(payAmount) > 0) || payingNow}
                  loading={payingNow}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function PledgeCard({
  pledge,
  index,
  theme,
  showMember,
  onRecordPayment,
}: {
  pledge: Pledge;
  index: number;
  theme: any;
  showMember: boolean;
  onRecordPayment?: () => void;
}) {
  const meta = STATUS_META[pledge.status] ?? STATUS_META.UNPAID;
  const pct = pledge.amount > 0 ? Math.min(1, pledge.amountPaid / pledge.amount) : 0;

  return (
    <ScrollReveal delay={index * StaggerDelay.list} style={styles.cardWrap}>
      <KlinkCard style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            {showMember && (
              <Text style={[styles.cardMember, { color: theme.text }]} numberOfLines={1}>
                {pledge.memberName}
              </Text>
            )}
            <Text style={[styles.cardDesc, { color: showMember ? theme.textMuted : theme.text }]} numberOfLines={1}>
              {pledge.description || 'General pledge'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${meta.color}20` }]}>
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {/* Progress bar — gold fill over a faint track */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
        </View>
        <View style={styles.amountsRow}>
          <Text style={[styles.amountPaid, { color: Colors.gold }]}>
            {formatCurrency(pledge.amountPaid)}
          </Text>
          <Text style={[styles.amountTotal, { color: theme.textMuted }]}>
            of {formatCurrency(pledge.amount)}
          </Text>
        </View>

        {onRecordPayment && (
          <TouchableOpacity
            onPress={onRecordPayment}
            style={styles.payBtn}
            accessibilityRole="button"
            accessibilityLabel="Record a payment on this pledge"
          >
            <Text style={styles.payBtnText}>Record payment</Text>
          </TouchableOpacity>
        )}
      </KlinkCard>
    </ScrollReveal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.lg, gap: 4 },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  headerTitle: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.tight },
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
    alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.white },
  tabText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  tabTextActive: { color: Colors.purple },
  cardWrap: { marginHorizontal: Spacing.pagePadding, marginBottom: Spacing.sm },
  card: { gap: Spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  cardMember: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  cardDesc: { fontSize: FontSize.small, marginTop: 2 },
  statusBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: FontSize.caption, fontWeight: FontWeight.semiBold },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: Colors.gold },
  amountsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  amountPaid: { fontSize: FontSize.body, fontWeight: FontWeight.bold },
  amountTotal: { fontSize: FontSize.caption },
  payBtn: {
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: BorderRadius.lg,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payBtnText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.bold },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: Spacing.pagePadding,
  },
  modalCard: { borderRadius: BorderRadius.xxl, overflow: 'hidden', padding: Spacing.lg, gap: Spacing.md },
  modalGlass: {
    borderRadius: BorderRadius.xxl,
    backgroundColor: 'rgba(26,31,62,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  modalTitle: { color: Colors.white, fontSize: FontSize.h4, fontWeight: FontWeight.bold },
  modalSub: { color: 'rgba(255,255,255,0.55)', fontSize: FontSize.caption },
  pickedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.4)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  pickedName: { color: Colors.white, fontSize: FontSize.body, fontWeight: FontWeight.semiBold, flex: 1 },
  pickedClear: { minHeight: 44, justifyContent: 'center', paddingLeft: Spacing.sm },
  pickedClearText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  searchInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: FontSize.body,
  },
  results: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  resultRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    minHeight: 44,
    justifyContent: 'center',
  },
  resultName: { color: Colors.white, fontSize: FontSize.small, fontWeight: FontWeight.medium },
  resultPhone: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.caption, marginTop: 1 },
  amountLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wider,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.3)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
  },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  modalCancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  modalCancelText: { color: Colors.darkMuted, fontSize: FontSize.body, fontWeight: FontWeight.medium },
});
