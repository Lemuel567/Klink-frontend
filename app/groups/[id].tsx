import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { KlinkCard } from '../../src/components/common/KlinkCard';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { AnnouncementSkeleton } from '../../src/components/common/KlinkSkeleton';
import { groupsApi, GroupMessage, DuesStatus } from '../../src/api/groups';
import { membersApi, Member } from '../../src/api/members';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useDebounce } from '../../src/hooks/useDebounce';
import { useRole } from '../../src/store/authStore';
import { formatRelativeTime } from '../../src/utils/formatters';
import { PAGE_SIZE } from '../../src/utils/constants';

const CHURCH_LEADERS = ['PASTOR', 'ELDER'];

type GroupParams = {
  id: string;
  groupName?: string;
  description?: string;
  duesAmount?: string;
  status?: string;
  groupAdminName?: string;
  groupFinSecName?: string;
};

function currentMonth() {
  return new Date().toISOString().substring(0, 7); // YYYY-MM
}

export default function GroupDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<GroupParams>();

  const isChurchLeader = role ? CHURCH_LEADERS.includes(role) : false;
  const isGroupAdmin = role === 'GROUP_ADMIN';
  const isGroupFinSec = role === 'GROUP_FINANCIAL_SECRETARY';
  const canSeeDues = isGroupAdmin || isGroupFinSec;

  const [tab, setTab] = useState<'messages' | 'dues'>('messages');
  const [message, setMessage] = useState('');
  const [duesMonth, setDuesMonth] = useState(currentMonth);

  // Add-member modal (Pastor / Elder)
  const [adding, setAdding] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const debouncedSearch = useDebounce(memberSearch, 400);

  const messagesQuery = useInfiniteQuery({
    queryKey: ['group-messages', params.id],
    queryFn: ({ pageParam = 0 }) =>
      groupsApi.getMessages(params.id, { page: pageParam, size: PAGE_SIZE }),
    getNextPageParam: (last) => (last.number + 1 < last.totalPages ? last.number + 1 : undefined),
    initialPageParam: 0,
  });

  const messages: GroupMessage[] = messagesQuery.data?.pages?.flatMap((p) => p.content) ?? [];

  const duesQuery = useQuery<DuesStatus[]>({
    queryKey: ['group-dues', params.id, duesMonth],
    queryFn: () => groupsApi.getDuesStatus(params.id, duesMonth),
    enabled: canSeeDues && tab === 'dues' && /^\d{4}-\d{2}$/.test(duesMonth),
  });

  const { data: memberResults, isFetching: searching } = useQuery({
    queryKey: ['member-search', debouncedSearch],
    queryFn: () => membersApi.list({ search: debouncedSearch, size: 10 }),
    enabled: adding && debouncedSearch.length >= 2,
  });

  const { mutate: postMessage, isPending: posting } = useMutation({
    mutationFn: () => groupsApi.postMessage(params.id, message.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages', params.id] });
      haptics.success();
      setMessage('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not post the message.');
      haptics.error();
    },
  });

  const { mutate: addMember } = useMutation({
    mutationFn: (memberId: string) => groupsApi.addMember(params.id, memberId),
    onSuccess: () => {
      haptics.success();
      setAdding(false);
      setMemberSearch('');
      Alert.alert('Member added', 'They are now part of this group.');
    },
    onError: (err: any) => {
      const msg =
        err?.response?.status === 409
          ? 'This member is already in the group.'
          : err?.friendlyMessage ?? 'Could not add the member.';
      Alert.alert('Error', msg);
      haptics.error();
    },
  });

  const { mutate: recordDues, isPending: recordingDues } = useMutation({
    mutationFn: (m: DuesStatus) =>
      groupsApi.recordDues(params.id, {
        memberId: m.memberId,
        amount: params.duesAmount ? parseFloat(params.duesAmount) : 0,
        paymentMonth: duesMonth,
        paymentDate: new Date().toISOString().split('T')[0],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-dues', params.id] });
      haptics.success();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not record the dues payment.');
      haptics.error();
    },
  });

  const dues: DuesStatus[] = duesQuery.data ?? [];
  const paidCount = dues.filter((d) => d.paid).length;

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
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>{params.groupName ?? 'Group'}</Text>
            {params.description ? (
              <Text style={styles.headerSub} numberOfLines={2}>{params.description}</Text>
            ) : null}
            <Text style={styles.headerMeta}>
              {params.groupAdminName ? `Led by ${params.groupAdminName}` : 'No leader yet'}
              {params.duesAmount ? ` · Dues GHS ${params.duesAmount}/month` : ''}
            </Text>
          </View>
          {isChurchLeader && (
            <TouchableOpacity
              onPress={() => { haptics.medium(); setAdding(true); }}
              style={styles.addBtn}
              accessibilityRole="button"
              accessibilityLabel="Add a member to this group"
            >
              <Text style={styles.addBtnText}>+ Member</Text>
            </TouchableOpacity>
          )}
        </View>

        {canSeeDues && (
          <View style={styles.tabBar}>
            {(['messages', 'dues'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => { haptics.light(); setTab(t); }}
                style={[styles.tab, tab === t && styles.tabActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t }}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'messages' ? 'Messages' : 'Dues'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </LinearGradient>

      {tab === 'messages' ? (
        <>
          {messagesQuery.isLoading ? (
            <View style={{ paddingTop: Spacing.md }}>
              {Array.from({ length: 5 }, (_, i) => <AnnouncementSkeleton key={i} />)}
            </View>
          ) : (
            <FlashList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <KlinkCard style={styles.messageCard}>
                  <Text style={[styles.messageContent, { color: theme.text }]}>{item.content}</Text>
                  <Text style={[styles.messageMeta, { color: theme.textMuted }]}>
                    {formatRelativeTime(item.createdAt)}
                  </Text>
                </KlinkCard>
              )}
              onEndReached={() =>
                messagesQuery.hasNextPage &&
                !messagesQuery.isFetchingNextPage &&
                messagesQuery.fetchNextPage()
              }
              onEndReachedThreshold={0.3}
              refreshControl={
                <RefreshControl
                  refreshing={messagesQuery.isRefetching}
                  onRefresh={messagesQuery.refetch}
                  tintColor={Colors.gold}
                />
              }
              contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: isGroupAdmin ? 140 : 60 }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                    {(messagesQuery.error as any)?.response?.status === 403
                      ? 'Only group members can read these messages.'
                      : 'No messages in this group yet.'}
                  </Text>
                </View>
              }
            />
          )}

          {/* Composer — GROUP_ADMIN only */}
          {isGroupAdmin && (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[styles.composer, { paddingBottom: insets.bottom + Spacing.sm, backgroundColor: theme.surface }]}
            >
              <KlinkInput
                label="Message your group..."
                value={message}
                onChangeText={setMessage}
                containerStyle={styles.composerInput}
                multiline
              />
              <KlinkButton
                label="Post"
                onPress={() => { if (message.trim()) postMessage(); }}
                disabled={!message.trim() || posting}
                loading={posting}
              />
            </KeyboardAvoidingView>
          )}
        </>
      ) : (
        // Dues tab — GROUP_ADMIN reads, GROUP_FINANCIAL_SECRETARY records
        <View style={styles.duesWrap}>
          <View style={styles.duesHeader}>
            <KlinkInput
              label="Month (YYYY-MM)"
              value={duesMonth}
              onChangeText={setDuesMonth}
              autoCapitalize="none"
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
            <Text style={[styles.duesSummary, { color: theme.textMuted }]}>
              {duesQuery.isSuccess ? `${paidCount}/${dues.length} paid` : ''}
            </Text>
          </View>

          {duesQuery.isLoading ? (
            <View style={{ paddingTop: Spacing.md }}>
              {Array.from({ length: 5 }, (_, i) => <AnnouncementSkeleton key={i} />)}
            </View>
          ) : (
            <FlashList
              data={dues}
              keyExtractor={(item) => item.memberId}
              renderItem={({ item }) => (
                <KlinkCard style={styles.duesCard}>
                  <View style={styles.duesRow}>
                    <View style={styles.duesInfo}>
                      <Text style={[styles.duesName, { color: theme.text }]} numberOfLines={1}>
                        {item.memberName}
                      </Text>
                      {item.paid && item.amountPaid != null ? (
                        <Text style={[styles.duesMeta, { color: theme.textMuted }]}>
                          Paid GHS {item.amountPaid}
                        </Text>
                      ) : null}
                    </View>
                    {item.paid ? (
                      <View style={[styles.paidBadge, { backgroundColor: `${Colors.success}22`, borderColor: `${Colors.success}66` }]}>
                        <Text style={[styles.paidText, { color: Colors.success }]}>Paid</Text>
                      </View>
                    ) : isGroupFinSec ? (
                      <TouchableOpacity
                        onPress={() => { haptics.medium(); recordDues(item); }}
                        disabled={recordingDues}
                        style={styles.recordBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Record dues for ${item.memberName}`}
                      >
                        <Text style={styles.recordText}>Record</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.paidBadge, { backgroundColor: `${Colors.red}22`, borderColor: `${Colors.red}66` }]}>
                        <Text style={[styles.paidText, { color: Colors.red }]}>Unpaid</Text>
                      </View>
                    )}
                  </View>
                </KlinkCard>
              )}
              refreshControl={
                <RefreshControl
                  refreshing={duesQuery.isRefetching}
                  onRefresh={duesQuery.refetch}
                  tintColor={Colors.gold}
                />
              }
              contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: 60 }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                    {(duesQuery.error as any)?.response?.status === 403
                      ? 'Only this group\'s admin or financial secretary can view dues.'
                      : 'No dues records for this month yet.'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* Add member modal — Pastor / Elder */}
      <Modal visible={adding} transparent animationType="fade" onRequestClose={() => setAdding(false)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />

            <Text style={styles.modalTitle}>Add member to {params.groupName ?? 'group'}</Text>

            <KlinkInput
              label="Search member by name..."
              value={memberSearch}
              onChangeText={setMemberSearch}
              autoCapitalize="words"
              containerStyle={{ marginBottom: 0 }}
            />
            {debouncedSearch.length >= 2 && (
              <View style={styles.pickerList}>
                {searching && <ActivityIndicator color={Colors.gold} style={{ padding: Spacing.md }} />}
                {!searching && (memberResults?.content?.length ?? 0) === 0 && (
                  <Text style={styles.pickerHint}>No members found</Text>
                )}
                {(memberResults?.content ?? []).map((m: Member) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => { haptics.medium(); addMember(m.id); }}
                    style={styles.pickerItem}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${m.fullName}`}
                  >
                    <Text style={styles.pickerItemName}>{m.fullName}</Text>
                    <Text style={styles.pickerItemAdd}>Add +</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              onPress={() => { haptics.light(); setAdding(false); }}
              style={styles.modalCancel}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.modalCancelText}>Done</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.md, gap: Spacing.sm },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  headerInfo: { flex: 1, gap: 4 },
  headerTitle: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.small, lineHeight: 20 },
  headerMeta: { color: Colors.gold, fontSize: FontSize.caption, fontWeight: FontWeight.semiBold },
  addBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  addBtnText: { color: Colors.white, fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  tabBar: {
    flexDirection: 'row',
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
    minWidth: 90,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.white },
  tabText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  tabTextActive: { color: Colors.purple },
  messageCard: { marginHorizontal: Spacing.pagePadding, marginBottom: Spacing.sm, gap: 6 },
  messageContent: { fontSize: FontSize.body, lineHeight: FontSize.body * 1.6 },
  messageMeta: { fontSize: FontSize.caption },
  composer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.pagePadding,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  composerInput: { flex: 1, marginBottom: 0 },
  duesWrap: { flex: 1 },
  duesHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.md,
    paddingHorizontal: Spacing.pagePadding,
    paddingTop: Spacing.md,
  },
  duesSummary: { fontSize: FontSize.small, fontWeight: FontWeight.semiBold, paddingBottom: 12 },
  duesCard: { marginHorizontal: Spacing.pagePadding, marginBottom: Spacing.sm },
  duesRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  duesInfo: { flex: 1, gap: 2 },
  duesName: { fontSize: FontSize.body, fontWeight: FontWeight.medium },
  duesMeta: { fontSize: FontSize.caption },
  paidBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  paidText: { fontSize: FontSize.caption, fontWeight: FontWeight.bold },
  recordBtn: {
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  recordText: { color: Colors.white, fontSize: FontSize.caption, fontWeight: FontWeight.bold },
  empty: { padding: Spacing.xxxl, alignItems: 'center' },
  emptyText: { fontSize: FontSize.body, textAlign: 'center', lineHeight: 22 },
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
  pickerList: {
    backgroundColor: 'rgba(26,31,62,0.98)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    maxHeight: 220,
  },
  pickerHint: { color: Colors.darkMuted, fontSize: FontSize.small, padding: Spacing.md, textAlign: 'center' },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    minHeight: 44,
  },
  pickerItemName: { color: Colors.white, fontSize: FontSize.small, fontWeight: FontWeight.medium },
  pickerItemAdd: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.bold },
  modalCancel: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  modalCancelText: { color: Colors.gold, fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
});
