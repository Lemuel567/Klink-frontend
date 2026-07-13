import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { KlinkCard } from '../../src/components/common/KlinkCard';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { AnnouncementSkeleton } from '../../src/components/common/KlinkSkeleton';
import { groupsApi, GroupMessage, DuesStatus, GroupMember } from '../../src/api/groups';
import { membersApi, Member } from '../../src/api/members';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useDebounce } from '../../src/hooks/useDebounce';
import { useRole, useAuthStore } from '../../src/store/authStore';
import { formatRelativeTime } from '../../src/utils/formatters';
import { PAGE_SIZE } from '../../src/utils/constants';

const CHURCH_LEADERSHIP = ['PASTOR', 'ELDER', 'MANAGER'];

type Tab = 'posts' | 'members' | 'money';

function currentMonth() {
  return new Date().toISOString().substring(0, 7); // YYYY-MM
}

export default function GroupDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const myId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const groupId = params.id;

  // Always fetch fresh detail — group roles are per-group (admin/finsec by FK), not the church role.
  const groupQuery = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupsApi.get(groupId),
  });
  const group = groupQuery.data;

  const isGroupAdmin = !!group && !!myId && group.groupAdminId === myId;
  const isGroupFinSec = !!group && !!myId && group.groupFinSecId === myId;
  const isLeadership = role ? CHURCH_LEADERSHIP.includes(role) : false;
  const canManageMoney = isGroupAdmin || isGroupFinSec;
  const duesAmount = group?.duesAmount ?? 0;

  const [tab, setTab] = useState<Tab>('posts');
  const [message, setMessage] = useState('');
  const [duesMonth, setDuesMonth] = useState(currentMonth);
  const [headerH, setHeaderH] = useState(0); // measured to offset the keyboard-avoiding composer

  // Member picker modal — reused for add-member, appoint-admin, appoint-finsec
  const [picker, setPicker] = useState<null | 'add' | 'admin' | 'finsec'>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const debouncedSearch = useDebounce(memberSearch, 400);

  // ── Queries ────────────────────────────────────────────────────────────────
  const messagesQuery = useInfiniteQuery({
    queryKey: ['group-messages', groupId],
    queryFn: ({ pageParam = 0 }) => groupsApi.getMessages(groupId, { page: pageParam, size: PAGE_SIZE }),
    getNextPageParam: (last) => (last.number + 1 < last.totalPages ? last.number + 1 : undefined),
    initialPageParam: 0,
    enabled: tab === 'posts',
  });
  const messages: GroupMessage[] = messagesQuery.data?.pages?.flatMap((p) => p.content) ?? [];

  const membersQuery = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => groupsApi.getMembers(groupId),
    enabled: tab === 'members',
  });
  const members: GroupMember[] = membersQuery.data ?? [];

  const financeQuery = useQuery({
    queryKey: ['group-finance', groupId],
    queryFn: () => groupsApi.getFinanceSummary(groupId),
    enabled: tab === 'money' && canManageMoney,
  });

  const duesQuery = useQuery<DuesStatus[]>({
    queryKey: ['group-dues', groupId, duesMonth],
    queryFn: () => groupsApi.getDuesStatus(groupId, duesMonth),
    enabled: tab === 'money' && canManageMoney && /^\d{4}-\d{2}$/.test(duesMonth),
  });

  const { data: memberResults, isFetching: searching } = useQuery({
    queryKey: ['member-search', debouncedSearch],
    queryFn: () => membersApi.list({ search: debouncedSearch, size: 10 }),
    enabled: !!picker && debouncedSearch.length >= 2,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const refreshGroup = () => {
    queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
    queryClient.invalidateQueries({ queryKey: ['groups'] });
  };

  const { mutate: postMessage, isPending: posting } = useMutation({
    mutationFn: () => groupsApi.postMessage(groupId, message.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
      haptics.success();
      setMessage('');
    },
    onError: (err: any) => { Alert.alert('Error', err?.friendlyMessage ?? 'Could not post.'); haptics.error(); },
  });

  const { mutate: pickAndUploadPhoto, isPending: uploadingPhoto } = useMutation({
    mutationFn: async () => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw Object.assign(new Error('perm'), { friendlyMessage: 'Allow photo access in Settings.' });
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled || !result.assets?.[0]?.uri) return null;
      const uri = result.assets[0].uri;
      const name = uri.split('/').pop() ?? 'group.jpg';
      const ext = name.split('.').pop()?.toLowerCase() ?? 'jpg';
      return groupsApi.uploadPhoto(groupId, { uri, name, type: ext === 'png' ? 'image/png' : 'image/jpeg' });
    },
    onSuccess: (res) => { if (res) { refreshGroup(); haptics.success(); } },
    onError: (err: any) => { Alert.alert('Error', err?.friendlyMessage ?? 'Photo upload failed.'); haptics.error(); },
  });

  const { mutate: runPickerAction } = useMutation({
    mutationFn: (memberId: string) => {
      if (picker === 'admin') return groupsApi.assignAdmin(groupId, memberId);
      if (picker === 'finsec') return groupsApi.assignFinSec(groupId, memberId);
      return groupsApi.addMember(groupId, memberId);
    },
    onSuccess: () => {
      const what = picker === 'admin' ? 'Group admin set.' : picker === 'finsec' ? 'Financial secretary set.' : 'Member added.';
      refreshGroup();
      haptics.success();
      setPicker(null);
      setMemberSearch('');
      Alert.alert('Done', what);
    },
    onError: (err: any) => {
      const msg = err?.response?.status === 409 ? 'That member is already in the group.' : err?.friendlyMessage ?? 'Action failed.';
      Alert.alert('Error', msg);
      haptics.error();
    },
  });

  const { mutate: removeMember } = useMutation({
    mutationFn: (memberId: string) => groupsApi.removeMember(groupId, memberId),
    onSuccess: () => { refreshGroup(); haptics.success(); },
    onError: (err: any) => { Alert.alert('Error', err?.friendlyMessage ?? 'Could not remove the member.'); haptics.error(); },
  });

  const { mutate: recordDues, isPending: recordingDues } = useMutation({
    mutationFn: (m: DuesStatus) =>
      groupsApi.recordDues(groupId, {
        memberId: m.memberId,
        amount: duesAmount,
        paymentMonth: duesMonth,
        paymentDate: new Date().toISOString().split('T')[0],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-dues', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-finance', groupId] });
      haptics.success();
    },
    onError: (err: any) => { Alert.alert('Error', err?.friendlyMessage ?? 'Could not record dues.'); haptics.error(); },
  });

  const dues: DuesStatus[] = duesQuery.data ?? [];
  const paidCount = dues.filter((d) => d.paid).length;

  const confirmRemove = (m: GroupMember) => {
    if (m.isAdmin) {
      Alert.alert('Cannot remove', 'Assign a new admin before removing this member.');
      return;
    }
    Alert.alert('Remove member', `Remove ${m.fullName} from this group?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMember(m.memberId) },
    ]);
  };

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'posts', label: 'Posts', show: true },
    { key: 'members', label: 'Members', show: true },
    { key: 'money', label: 'Money', show: canManageMoney },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={Gradients.worship}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
        onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          {/* Group photo — admin can tap to change */}
          <TouchableOpacity
            disabled={!isGroupAdmin && !isLeadership}
            onPress={() => pickAndUploadPhoto()}
            style={styles.avatarWrap}
            accessibilityRole="button"
            accessibilityLabel="Group photo"
          >
            {group?.photoUrl ? (
              <Image source={{ uri: group.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>{(group?.groupName ?? 'G').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            {uploadingPhoto ? (
              <View style={styles.avatarOverlay}><ActivityIndicator color={Colors.white} /></View>
            ) : (isGroupAdmin || isLeadership) ? (
              <View style={styles.avatarBadge}><Text style={styles.avatarBadgeText}>✎</Text></View>
            ) : null}
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>{group?.groupName ?? 'Group'}</Text>
            {group?.description ? <Text style={styles.headerSub} numberOfLines={2}>{group.description}</Text> : null}
            <Text style={styles.headerMeta}>
              {group?.groupAdminName ? `Led by ${group.groupAdminName}` : 'No admin yet'}
              {` · ${group?.memberCount ?? 0} member${(group?.memberCount ?? 0) === 1 ? '' : 's'}`}
            </Text>
          </View>
        </View>

        <View style={styles.tabBar}>
          {tabs.filter((t) => t.show).map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => { haptics.light(); setTab(t.key); }}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t.key }}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* ── POSTS ── */}
      {tab === 'posts' && (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={headerH}
        >
          {messagesQuery.isLoading ? (
            <View style={{ flex: 1, paddingTop: Spacing.md }}>
              {Array.from({ length: 5 }, (_, i) => <AnnouncementSkeleton key={i} />)}
            </View>
          ) : (
            <FlashList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <KlinkCard style={styles.messageCard}>
                  <Text style={[styles.messageContent, { color: theme.text }]}>{item.content}</Text>
                  <Text style={[styles.messageMeta, { color: theme.textMuted }]}>{formatRelativeTime(item.createdAt)}</Text>
                </KlinkCard>
              )}
              onEndReached={() => messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage && messagesQuery.fetchNextPage()}
              onEndReachedThreshold={0.3}
              refreshControl={<RefreshControl refreshing={messagesQuery.isRefetching} onRefresh={messagesQuery.refetch} tintColor={Colors.gold} />}
              contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: Spacing.lg }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                    {(messagesQuery.error as any)?.response?.status === 403
                      ? 'Only group members can read these posts.'
                      : isGroupAdmin ? 'Share the first update with your group below.' : 'No posts in this group yet.'}
                  </Text>
                </View>
              }
            />
          )}

          {/* Composer — GROUP ADMIN only. A glass bar pinned above the keyboard with a
              gold send button; white text on a clearly-bordered field so it's always readable. */}
          {isGroupAdmin && (
            <View style={[styles.composer, { paddingBottom: insets.bottom + 10 }]}>
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, styles.composerGlass]} />
              <TextInput
                style={styles.composerField}
                placeholder="Share with your group…"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={message}
                onChangeText={setMessage}
                multiline
                textAlignVertical="top"
                accessibilityLabel="Message to your group"
              />
              <TouchableOpacity
                onPress={() => { if (message.trim()) { haptics.medium(); postMessage(); } }}
                disabled={!message.trim() || posting}
                style={[styles.sendBtn, (!message.trim() || posting) && styles.sendBtnDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Post to group"
              >
                {posting ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.sendIcon}>↑</Text>}
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      )}

      {/* ── MEMBERS ── */}
      {tab === 'members' && (
        <View style={{ flex: 1 }}>
          {/* Admin / leadership action bar */}
          {(isGroupAdmin || isLeadership) && (
            <View style={styles.actionBar}>
              {isGroupAdmin && (
                <TouchableOpacity onPress={() => { haptics.medium(); setPicker('add'); }} style={styles.actionChip}>
                  <Text style={styles.actionChipText}>+ Add member</Text>
                </TouchableOpacity>
              )}
              {isGroupAdmin && (
                <TouchableOpacity onPress={() => { haptics.medium(); setPicker('finsec'); }} style={styles.actionChip}>
                  <Text style={styles.actionChipText}>Set fin. secretary</Text>
                </TouchableOpacity>
              )}
              {isLeadership && (
                <TouchableOpacity onPress={() => { haptics.medium(); setPicker('admin'); }} style={styles.actionChip}>
                  <Text style={styles.actionChipText}>{group?.groupAdminId ? 'Change admin' : 'Appoint admin'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {membersQuery.isLoading ? (
            <View style={{ paddingTop: Spacing.md }}>{Array.from({ length: 5 }, (_, i) => <AnnouncementSkeleton key={i} />)}</View>
          ) : (
            <FlashList
              data={members}
              keyExtractor={(item) => item.memberId}
              renderItem={({ item }) => (
                <KlinkCard style={styles.memberCard}>
                  <View style={styles.memberRow}>
                    {item.photoUrl ? (
                      <Image source={{ uri: item.photoUrl }} style={styles.memberAvatar} />
                    ) : (
                      <View style={[styles.memberAvatar, styles.avatarPlaceholder]}>
                        <Text style={styles.memberInitial}>{item.fullName.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: theme.text }]} numberOfLines={1}>{item.fullName}</Text>
                      {item.phone ? <Text style={[styles.memberPhone, { color: theme.textMuted }]}>{item.phone}</Text> : null}
                    </View>
                    <View style={styles.memberBadges}>
                      {item.isAdmin && <View style={[styles.roleBadge, { borderColor: Colors.gold }]}><Text style={[styles.roleBadgeText, { color: Colors.gold }]}>Admin</Text></View>}
                      {item.isFinSec && <View style={[styles.roleBadge, { borderColor: Colors.success }]}><Text style={[styles.roleBadgeText, { color: Colors.success }]}>Fin. Sec</Text></View>}
                      {isGroupAdmin && !item.isAdmin && (
                        <TouchableOpacity onPress={() => confirmRemove(item)} style={styles.removeBtn} accessibilityRole="button" accessibilityLabel={`Remove ${item.fullName}`}>
                          <Text style={styles.removeBtnText}>Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </KlinkCard>
              )}
              refreshControl={<RefreshControl refreshing={membersQuery.isRefetching} onRefresh={membersQuery.refetch} tintColor={Colors.gold} />}
              contentContainerStyle={{ paddingTop: Spacing.sm, paddingBottom: 60 }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                    {(membersQuery.error as any)?.response?.status === 403 ? 'You are not part of this group.' : 'No members yet.'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* ── MONEY (separate from church finances) ── */}
      {tab === 'money' && canManageMoney && (
        <ScrollView contentContainerStyle={{ padding: Spacing.pagePadding, paddingBottom: 60 }}>
          {/* Summary */}
          <KlinkCard style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>GROUP FUNDS · SEPARATE FROM CHURCH</Text>
            <Text style={styles.summaryTotal}>GHS {(financeQuery.data?.totalCollected ?? 0).toLocaleString()}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatNum}>GHS {(financeQuery.data?.thisMonthCollected ?? 0).toLocaleString()}</Text>
                <Text style={[styles.summaryStatLabel, { color: theme.textMuted }]}>This month</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatNum}>{financeQuery.data?.paidThisMonth ?? 0}/{financeQuery.data?.memberCount ?? 0}</Text>
                <Text style={[styles.summaryStatLabel, { color: theme.textMuted }]}>Paid this month</Text>
              </View>
            </View>
          </KlinkCard>

          {/* Dues status + record (fin sec) */}
          <View style={styles.duesHeader}>
            <KlinkInput label="Month (YYYY-MM)" value={duesMonth} onChangeText={setDuesMonth} autoCapitalize="none" containerStyle={{ flex: 1, marginBottom: 0 }} />
            <Text style={[styles.duesSummary, { color: theme.textMuted }]}>{duesQuery.isSuccess ? `${paidCount}/${dues.length} paid` : ''}</Text>
          </View>

          {isGroupFinSec && (!duesAmount || duesAmount <= 0) && (
            <Text style={styles.warnText}>Set a monthly dues amount (edit the group) before recording dues.</Text>
          )}

          {duesQuery.isLoading ? (
            <View style={{ paddingTop: Spacing.md }}>{Array.from({ length: 4 }, (_, i) => <AnnouncementSkeleton key={i} />)}</View>
          ) : (
            dues.map((item) => (
              <KlinkCard key={item.memberId} style={styles.duesCard}>
                <View style={styles.duesRow}>
                  <View style={styles.duesInfo}>
                    <Text style={[styles.duesName, { color: theme.text }]} numberOfLines={1}>{item.memberName}</Text>
                    {item.paid && item.amountPaid != null ? <Text style={[styles.duesMeta, { color: theme.textMuted }]}>Paid GHS {item.amountPaid}</Text> : null}
                  </View>
                  {item.paid ? (
                    <View style={[styles.paidBadge, { backgroundColor: `${Colors.success}22`, borderColor: `${Colors.success}66` }]}>
                      <Text style={[styles.paidText, { color: Colors.success }]}>Paid</Text>
                    </View>
                  ) : isGroupFinSec ? (
                    <TouchableOpacity onPress={() => { haptics.medium(); recordDues(item); }} disabled={recordingDues || !duesAmount} style={[styles.recordBtn, !duesAmount && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel={`Record dues for ${item.memberName}`}>
                      <Text style={styles.recordText}>Record</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.paidBadge, { backgroundColor: `${Colors.red}22`, borderColor: `${Colors.red}66` }]}>
                      <Text style={[styles.paidText, { color: Colors.red }]}>Unpaid</Text>
                    </View>
                  )}
                </View>
              </KlinkCard>
            ))
          )}
          {!duesQuery.isLoading && dues.length === 0 && (
            <Text style={[styles.emptyText, { color: theme.textMuted, padding: Spacing.xl }]}>No dues records for this month yet.</Text>
          )}
        </ScrollView>
      )}

      {/* Member picker modal (add / appoint admin / appoint fin sec) */}
      <Modal visible={!!picker} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />
            <Text style={styles.modalTitle}>
              {picker === 'admin' ? 'Appoint group admin' : picker === 'finsec' ? 'Appoint financial secretary' : 'Add member'}
            </Text>
            {picker === 'finsec' && <Text style={styles.modalHint}>Choose someone who is already a group member.</Text>}

            <KlinkInput label="Search member by name..." value={memberSearch} onChangeText={setMemberSearch} autoCapitalize="words" containerStyle={{ marginBottom: 0 }} />
            {debouncedSearch.length >= 2 && (
              <View style={styles.pickerList}>
                {searching && <ActivityIndicator color={Colors.gold} style={{ padding: Spacing.md }} />}
                {!searching && (memberResults?.content?.length ?? 0) === 0 && <Text style={styles.pickerHint}>No members found</Text>}
                {(memberResults?.content ?? []).map((m: Member) => (
                  <TouchableOpacity key={m.id} onPress={() => { haptics.medium(); runPickerAction(m.id); }} style={styles.pickerItem} accessibilityRole="button" accessibilityLabel={m.fullName}>
                    <Text style={styles.pickerItemName}>{m.fullName}</Text>
                    <Text style={styles.pickerItemAdd}>Select</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity onPress={() => { haptics.light(); setPicker(null); setMemberSearch(''); }} style={styles.modalCancel} accessibilityRole="button" accessibilityLabel="Close">
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
  flex: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.md, gap: Spacing.sm },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatarWrap: { width: 64, height: 64 },
  avatar: { width: 64, height: 64, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  avatarPlaceholder: { backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold },
  avatarOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  avatarBadge: { position: 'absolute', right: -4, bottom: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarBadgeText: { color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold },
  headerInfo: { flex: 1, gap: 4 },
  headerTitle: { color: Colors.white, fontSize: FontSize.h3, fontWeight: FontWeight.bold },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.small, lineHeight: 20 },
  headerMeta: { color: Colors.gold, fontSize: FontSize.caption, fontWeight: FontWeight.semiBold },
  tabBar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.full, padding: 3, alignSelf: 'flex-start' },
  tab: { paddingHorizontal: Spacing.lg, paddingVertical: 8, borderRadius: BorderRadius.full, minHeight: 36, justifyContent: 'center', minWidth: 80, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.white },
  tabText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  tabTextActive: { color: Colors.purple },
  messageCard: { marginHorizontal: Spacing.pagePadding, marginBottom: Spacing.sm, gap: 6 },
  messageContent: { fontSize: FontSize.body, lineHeight: FontSize.body * 1.6 },
  messageMeta: { fontSize: FontSize.caption },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.pagePadding,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  composerGlass: { backgroundColor: 'rgba(16,11,36,0.9)' },
  composerField: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 24,
    paddingHorizontal: Spacing.md,
    paddingTop: 13,
    paddingBottom: 13,
    color: '#FFFFFF',
    fontSize: FontSize.body,
    lineHeight: 21,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold, lineHeight: 26 },
  actionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.pagePadding, paddingTop: Spacing.md },
  actionChip: { borderWidth: 1.5, borderColor: Colors.gold, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 8, minHeight: 40, justifyContent: 'center' },
  actionChipText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.bold },
  memberCard: { marginHorizontal: Spacing.pagePadding, marginBottom: Spacing.sm },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  memberAvatar: { width: 44, height: 44, borderRadius: 22 },
  memberInitial: { color: Colors.white, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  memberInfo: { flex: 1, gap: 2 },
  memberName: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  memberPhone: { fontSize: FontSize.caption },
  memberBadges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, borderWidth: 1 },
  roleBadgeText: { fontSize: FontSize.caption, fontWeight: FontWeight.bold },
  removeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: `${Colors.red}88` },
  removeBtnText: { color: Colors.red, fontSize: FontSize.caption, fontWeight: FontWeight.bold },
  summaryCard: { marginBottom: Spacing.md, gap: Spacing.sm },
  summaryLabel: { fontSize: FontSize.caption, fontWeight: FontWeight.bold, letterSpacing: 1 },
  summaryTotal: { color: Colors.gold, fontSize: 34, fontWeight: FontWeight.bold },
  summaryRow: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm },
  summaryStat: { flex: 1 },
  summaryStatNum: { color: Colors.white, fontSize: FontSize.h4, fontWeight: FontWeight.bold },
  summaryStatLabel: { fontSize: FontSize.caption },
  duesHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.md, marginBottom: Spacing.sm },
  duesSummary: { fontSize: FontSize.small, fontWeight: FontWeight.semiBold, paddingBottom: 12 },
  warnText: { color: Colors.gold, fontSize: FontSize.small, marginBottom: Spacing.sm },
  duesCard: { marginBottom: Spacing.sm },
  duesRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  duesInfo: { flex: 1, gap: 2 },
  duesName: { fontSize: FontSize.body, fontWeight: FontWeight.medium },
  duesMeta: { fontSize: FontSize.caption },
  paidBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  paidText: { fontSize: FontSize.caption, fontWeight: FontWeight.bold },
  recordBtn: { backgroundColor: Colors.gold, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
  recordText: { color: Colors.white, fontSize: FontSize.caption, fontWeight: FontWeight.bold },
  empty: { padding: Spacing.xxxl, alignItems: 'center' },
  emptyText: { fontSize: FontSize.body, textAlign: 'center', lineHeight: 22 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: Spacing.pagePadding },
  modalCard: { borderRadius: BorderRadius.xxl, overflow: 'hidden', padding: Spacing.lg, gap: Spacing.md },
  modalGlass: { borderRadius: BorderRadius.xxl, backgroundColor: 'rgba(26,31,62,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  modalTitle: { color: Colors.white, fontSize: FontSize.h4, fontWeight: FontWeight.bold },
  modalHint: { color: Colors.darkMuted, fontSize: FontSize.small, marginTop: -6 },
  pickerList: { backgroundColor: 'rgba(26,31,62,0.98)', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', maxHeight: 220 },
  pickerHint: { color: Colors.darkMuted, fontSize: FontSize.small, padding: Spacing.md, textAlign: 'center' },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', minHeight: 44 },
  pickerItemName: { color: Colors.white, fontSize: FontSize.small, fontWeight: FontWeight.medium },
  pickerItemAdd: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.bold },
  modalCancel: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  modalCancelText: { color: Colors.gold, fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
});
