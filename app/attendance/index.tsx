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
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { KlinkCard } from '../../src/components/common/KlinkCard';
import { AnnouncementSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { WatermarkBackground } from '../../src/components/common/WatermarkBackground';
import { ScreenPhotos } from '../../src/utils/worshipImages';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { attendanceApi, AttendanceRecord } from '../../src/api/attendance';
import { membersApi, Member } from '../../src/api/members';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useDebounce } from '../../src/hooks/useDebounce';
import { useRole } from '../../src/store/authStore';
import { StaggerDelay } from '../../src/theme/animations';
import { ATTENDANCE_PAGE_SIZE } from '../../src/utils/constants';

const LEADERS = ['PASTOR', 'ELDER', 'MANAGER'];

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

export default function AttendanceScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();

  const isLeader = role ? LEADERS.includes(role) : false;
  const [tab, setTab] = useState<'me' | 'all'>('me');

  // Manual marking modal state (leaders)
  const [marking, setMarking] = useState(false);
  const [serviceName, setServiceName] = useState('Sunday Service');
  const [serviceDate, setServiceDate] = useState(todayIso);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Pick<Member, 'id' | 'fullName'> | null>(null);
  const debouncedSearch = useDebounce(memberSearch, 400);

  const myQuery = useInfiniteQuery({
    queryKey: ['attendance-me'],
    queryFn: ({ pageParam = 0 }) => attendanceApi.getMe({ page: pageParam, size: 20 }),
    getNextPageParam: (last) => (last.number + 1 < last.totalPages ? last.number + 1 : undefined),
    initialPageParam: 0,
  });

  const allQuery = useInfiniteQuery({
    queryKey: ['attendance-all'],
    queryFn: ({ pageParam = 0 }) => attendanceApi.getAll({ page: pageParam, size: ATTENDANCE_PAGE_SIZE }),
    getNextPageParam: (last) => (last.number + 1 < last.totalPages ? last.number + 1 : undefined),
    initialPageParam: 0,
    enabled: isLeader,
  });

  const activeQuery = tab === 'me' || !isLeader ? myQuery : allQuery;
  const records: AttendanceRecord[] = activeQuery.data?.pages?.flatMap((p) => p.content) ?? [];

  const { data: memberResults, isFetching: searchingMembers } = useQuery({
    queryKey: ['member-search', debouncedSearch],
    queryFn: () => membersApi.list({ search: debouncedSearch, size: 10 }),
    enabled: marking && debouncedSearch.length >= 2,
  });

  const { mutate: markManual, isPending: markPending } = useMutation({
    mutationFn: () =>
      attendanceApi.markManual({
        memberId: selectedMember!.id,
        serviceName: serviceName.trim(),
        serviceDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-all'] });
      haptics.success();
      setMarking(false);
      setSelectedMember(null);
      setMemberSearch('');
    },
    onError: (err: any) => {
      const msg =
        err?.response?.status === 409
          ? 'This member is already marked for that service.'
          : err?.friendlyMessage ?? 'Could not mark attendance. Please try again.';
      Alert.alert('Error', msg);
      haptics.error();
    },
  });

  const handleMark = () => {
    if (!selectedMember) {
      Alert.alert('Select a member', 'Search and select the member to mark present.');
      haptics.error();
      return;
    }
    if (!serviceName.trim()) {
      Alert.alert('Service name', 'Enter the name of the service.');
      haptics.error();
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) {
      Alert.alert('Invalid date', 'Enter the date as YYYY-MM-DD.');
      haptics.error();
      return;
    }
    markManual();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <WatermarkBackground
        imageSource={ScreenPhotos.attendance}
        overlayOpacity={0.6}
        overlayColor="#1A0533"
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance</Text>
        <Text style={styles.headerSub}>Check in and see your record</Text>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => { haptics.medium(); router.push('/attendance/scan'); }}
            style={styles.actionBtn}
            accessibilityRole="button"
            accessibilityLabel="Scan QR code to check in"
          >
            <LinearGradient colors={Gradients.glory} style={styles.actionGradient}>
              <Text style={styles.actionText}>📷 Scan to Check In</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {isLeader && (
          <View style={styles.leaderRow}>
            <TouchableOpacity
              onPress={() => { haptics.medium(); router.push('/attendance/session'); }}
              style={styles.leaderBtn}
              accessibilityRole="button"
              accessibilityLabel="Start a QR check-in session"
            >
              <Text style={styles.leaderBtnText}>Start QR Session</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { haptics.medium(); setMarking(true); }}
              style={styles.leaderBtn}
              accessibilityRole="button"
              accessibilityLabel="Manually mark a member present"
            >
              <Text style={styles.leaderBtnText}>Mark Manually</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tabs for leaders */}
        {isLeader && (
          <View style={styles.tabBar}>
            {(['me', 'all'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => { haptics.light(); setTab(t); }}
                style={[styles.tab, tab === t && styles.tabActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t }}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'me' ? 'My Record' : 'All Members'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </WatermarkBackground>

      {activeQuery.isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 6 }, (_, i) => <AnnouncementSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ScrollReveal delay={Math.min(index, 8) * StaggerDelay.list}>
              <KlinkCard style={styles.recordCard}>
                <View style={styles.recordRow}>
                  <View style={styles.recordInfo}>
                    <Text style={[styles.recordService, { color: theme.text }]} numberOfLines={1}>
                      {item.serviceName}
                    </Text>
                    <Text style={[styles.recordMeta, { color: theme.textMuted }]}>
                      {item.serviceDate}
                      {tab === 'all' && item.memberName ? ` · ${item.memberName}` : ''}
                      {item.method === 'QR_SCAN' ? ' · QR' : ' · Manual'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: item.status === 'PRESENT' ? `${Colors.success}22` : `${Colors.red}22`,
                        borderColor: item.status === 'PRESENT' ? `${Colors.success}66` : `${Colors.red}66`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: item.status === 'PRESENT' ? Colors.success : Colors.red },
                      ]}
                    >
                      {item.status === 'PRESENT' ? 'Present' : 'Absent'}
                    </Text>
                  </View>
                </View>
              </KlinkCard>
            </ScrollReveal>
          )}
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
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: 60 }}
          ListEmptyComponent={
            <EmptyState
              icon="✓"
              title="No attendance records yet"
              subtitle="Scan the check-in QR at your next service to start your record."
            />
          }
        />
      )}

      {/* Manual mark modal — leaders */}
      <Modal visible={marking} transparent animationType="fade" onRequestClose={() => setMarking(false)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />

            <Text style={styles.modalTitle}>Mark member present</Text>

            {selectedMember ? (
              <TouchableOpacity
                style={styles.selectedMember}
                onPress={() => { setSelectedMember(null); haptics.light(); }}
                accessibilityRole="button"
                accessibilityLabel={`Selected: ${selectedMember.fullName}. Tap to change.`}
              >
                <Text style={styles.selectedMemberName}>{selectedMember.fullName}</Text>
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            ) : (
              <>
                <KlinkInput
                  label="Search member by name..."
                  value={memberSearch}
                  onChangeText={setMemberSearch}
                  autoCapitalize="words"
                  containerStyle={{ marginBottom: 0 }}
                />
                {debouncedSearch.length >= 2 && (
                  <View style={styles.pickerList}>
                    {searchingMembers && <ActivityIndicator color={Colors.gold} style={{ padding: Spacing.md }} />}
                    {!searchingMembers && (memberResults?.content?.length ?? 0) === 0 && (
                      <Text style={styles.pickerHint}>No members found</Text>
                    )}
                    {(memberResults?.content ?? []).map((m: Member) => (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => { setSelectedMember({ id: m.id, fullName: m.fullName }); setMemberSearch(''); haptics.light(); }}
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

            <KlinkInput label="Service name" value={serviceName} onChangeText={setServiceName} />
            <KlinkInput
              label="Service date (YYYY-MM-DD)"
              value={serviceDate}
              onChangeText={setServiceDate}
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { haptics.light(); setMarking(false); }}
                style={styles.modalCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.modalSubmit}>
                <KlinkButton
                  label="Mark Present"
                  onPress={handleMark}
                  disabled={!selectedMember || markPending}
                  loading={markPending}
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
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.md, gap: Spacing.sm },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  headerTitle: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  actionRow: { marginTop: Spacing.xs },
  actionBtn: { borderRadius: BorderRadius.full, overflow: 'hidden' },
  actionGradient: {
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.body },
  leaderRow: { flexDirection: 'row', gap: Spacing.sm },
  leaderBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: BorderRadius.full,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderBtnText: { color: Colors.white, fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
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
  recordCard: { marginHorizontal: Spacing.pagePadding, marginBottom: Spacing.sm },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  recordInfo: { flex: 1, gap: 2 },
  recordService: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  recordMeta: { fontSize: FontSize.caption },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
  statusText: { fontSize: FontSize.caption, fontWeight: FontWeight.bold },
  empty: { padding: Spacing.xxxl, alignItems: 'center' },
  emptyText: { fontSize: FontSize.body, textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: Spacing.pagePadding,
  },
  modalCard: {
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
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
