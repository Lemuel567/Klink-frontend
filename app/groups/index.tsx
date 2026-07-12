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
import { router } from 'expo-router';
import { KlinkCard } from '../../src/components/common/KlinkCard';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { AnnouncementSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { groupsApi, Group } from '../../src/api/groups';
import { membersApi, Member } from '../../src/api/members';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useDebounce } from '../../src/hooks/useDebounce';
import { useRole } from '../../src/store/authStore';
import { StaggerDelay } from '../../src/theme/animations';
import { PAGE_SIZE } from '../../src/utils/constants';

const LEADERS = ['PASTOR', 'ELDER'];

export default function GroupsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();

  const isLeader = role ? LEADERS.includes(role) : false;

  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [duesAmount, setDuesAmount] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState<Pick<Member, 'id' | 'fullName'> | null>(null);
  const debouncedSearch = useDebounce(adminSearch, 400);

  const query = useInfiniteQuery({
    queryKey: ['groups'],
    queryFn: ({ pageParam = 0 }) => groupsApi.getAll({ page: pageParam, size: PAGE_SIZE }),
    getNextPageParam: (last) => (last.number + 1 < last.totalPages ? last.number + 1 : undefined),
    initialPageParam: 0,
    enabled: isLeader,
  });

  const groups: Group[] = query.data?.pages?.flatMap((p) => p.content) ?? [];

  const { data: memberResults, isFetching: searching } = useQuery({
    queryKey: ['member-search', debouncedSearch],
    queryFn: () => membersApi.list({ search: debouncedSearch, size: 10 }),
    enabled: creating && debouncedSearch.length >= 2,
  });

  const { mutate: create, isPending: createPending } = useMutation({
    mutationFn: () =>
      groupsApi.create({
        groupName: groupName.trim(),
        description: description.trim() || undefined,
        duesAmount: duesAmount.trim() ? parseFloat(duesAmount) : undefined,
        groupAdminId: selectedAdmin?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      haptics.success();
      setCreating(false);
      setGroupName('');
      setDescription('');
      setDuesAmount('');
      setSelectedAdmin(null);
      setAdminSearch('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not create the group.');
      haptics.error();
    },
  });

  const handleCreate = () => {
    if (!groupName.trim()) {
      Alert.alert('Group name', 'Enter a name for the group.');
      haptics.error();
      return;
    }
    if (duesAmount.trim() && (isNaN(parseFloat(duesAmount)) || parseFloat(duesAmount) <= 0)) {
      Alert.alert('Dues amount', 'Enter a valid dues amount greater than 0, or leave it empty.');
      haptics.error();
      return;
    }
    create();
  };

  const openGroup = (g: Group) => {
    haptics.light();
    router.push({
      pathname: '/groups/[id]',
      params: {
        id: g.id,
        groupName: g.groupName,
        description: g.description ?? '',
        duesAmount: g.duesAmount != null ? String(g.duesAmount) : '',
        status: g.status,
        groupAdminName: g.groupAdminName ?? '',
        groupFinSecName: g.groupFinSecName ?? '',
      },
    });
  };

  if (!isLeader) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={Gradients.veil} style={StyleSheet.absoluteFill} />
        <View style={[styles.infoWrap, { paddingTop: insets.top + 32 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.infoIcon}>👥</Text>
          <Text style={styles.infoTitle}>Groups are managed by leaders</Text>
          <Text style={styles.infoBody}>
            Your Pastor or an Elder manages church groups. If you lead a group, they can share
            your group's page with you directly.
          </Text>
        </View>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Groups</Text>
        <Text style={styles.headerSub}>Ministries and fellowships in your church</Text>
      </LinearGradient>

      {query.isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 6 }, (_, i) => <AnnouncementSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ScrollReveal delay={Math.min(index, 8) * StaggerDelay.list}>
              <KlinkCard onPress={() => openGroup(item)} style={styles.groupCard}>
                <View style={styles.groupRow}>
                  <View style={styles.groupInfo}>
                    <Text style={[styles.groupName, { color: theme.text }]} numberOfLines={1}>
                      {item.groupName}
                    </Text>
                    {item.description ? (
                      <Text style={[styles.groupDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                    <Text style={[styles.groupMeta, { color: theme.textMuted }]}>
                      {item.groupAdminName ? `Led by ${item.groupAdminName}` : 'No leader assigned yet'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: item.status === 'ACTIVE' ? `${Colors.success}22` : `${Colors.gold}22`,
                        borderColor: item.status === 'ACTIVE' ? `${Colors.success}66` : `${Colors.gold}66`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: item.status === 'ACTIVE' ? Colors.success : Colors.gold },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>
              </KlinkCard>
            </ScrollReveal>
          )}
          onEndReached={() =>
            query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()
          }
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={Colors.gold} />
          }
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: 120 }}
          ListEmptyComponent={
            <EmptyState
              icon="👥"
              title="No groups yet"
              subtitle="Create ministries and fellowships so members can connect."
              actionLabel="Create the first group"
              onAction={() => setCreating(true)}
            />
          }
        />
      )}

      {/* Create FAB */}
      <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          onPress={() => { haptics.medium(); setCreating(true); }}
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel="Create a new group"
        >
          <LinearGradient colors={Gradients.glory} style={styles.fabGradient}>
            <Text style={styles.fabText}>+ New Group</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Create modal */}
      <Modal visible={creating} transparent animationType="fade" onRequestClose={() => setCreating(false)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />

            <Text style={styles.modalTitle}>Create group</Text>

            <KlinkInput label="Group name" value={groupName} onChangeText={setGroupName} autoCapitalize="words" />
            <KlinkInput label="Description (optional)" value={description} onChangeText={setDescription} />
            <KlinkInput
              label="Monthly dues GHS (optional)"
              value={duesAmount}
              onChangeText={setDuesAmount}
              keyboardType="decimal-pad"
            />

            {/* Group admin picker — group stays DRAFT until an admin is assigned */}
            {selectedAdmin ? (
              <TouchableOpacity
                style={styles.selectedMember}
                onPress={() => { setSelectedAdmin(null); haptics.light(); }}
                accessibilityRole="button"
                accessibilityLabel={`Group admin: ${selectedAdmin.fullName}. Tap to change.`}
              >
                <Text style={styles.selectedMemberName}>Admin: {selectedAdmin.fullName}</Text>
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            ) : (
              <>
                <KlinkInput
                  label="Search group admin (optional)"
                  value={adminSearch}
                  onChangeText={setAdminSearch}
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
                        onPress={() => { setSelectedAdmin({ id: m.id, fullName: m.fullName }); setAdminSearch(''); haptics.light(); }}
                        style={styles.pickerItem}
                        accessibilityRole="button"
                        accessibilityLabel={m.fullName}
                      >
                        <Text style={styles.pickerItemName}>{m.fullName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { haptics.light(); setCreating(false); }}
                style={styles.modalCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.modalSubmit}>
                <KlinkButton
                  label="Create Group"
                  onPress={handleCreate}
                  disabled={!groupName.trim() || createPending}
                  loading={createPending}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.md, gap: 4 },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  headerTitle: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  groupCard: { marginHorizontal: Spacing.pagePadding, marginBottom: Spacing.sm },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  groupInfo: { flex: 1, gap: 3 },
  groupName: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  groupDesc: { fontSize: FontSize.small, lineHeight: FontSize.small * 1.5 },
  groupMeta: { fontSize: FontSize.caption },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  statusText: { fontSize: FontSize.caption, fontWeight: FontWeight.bold },
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
  infoWrap: { flex: 1, padding: Spacing.xl, gap: Spacing.md },
  infoIcon: { fontSize: 48, textAlign: 'center', marginTop: Spacing.xxl },
  infoTitle: {
    color: Colors.white,
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  infoBody: {
    color: Colors.darkMuted,
    fontSize: FontSize.body,
    textAlign: 'center',
    lineHeight: 24,
  },
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
  selectedMember: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(244,164,41,0.15)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gold,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  selectedMemberName: { color: Colors.white, fontSize: FontSize.body, fontWeight: FontWeight.medium, flex: 1 },
  changeText: { color: Colors.gold, fontSize: FontSize.small },
  pickerList: {
    backgroundColor: 'rgba(26,31,62,0.98)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    maxHeight: 180,
  },
  pickerHint: { color: Colors.darkMuted, fontSize: FontSize.small, padding: Spacing.md, textAlign: 'center' },
  pickerItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    minHeight: 44,
  },
  pickerItemName: { color: Colors.white, fontSize: FontSize.small, fontWeight: FontWeight.medium },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  modalCancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  modalCancelText: { color: Colors.darkMuted, fontSize: FontSize.body, fontWeight: FontWeight.medium },
  modalSubmit: { flex: 1 },
});
