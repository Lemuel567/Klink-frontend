import React, { useState } from 'react';
import {
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
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PrayerCard } from '../../src/components/screens/PrayerCard';
import { WatermarkBackground } from '../../src/components/common/WatermarkBackground';
import { ScreenPhotos } from '../../src/utils/worshipImages';
import { AnnouncementSkeleton } from '../../src/components/common/KlinkSkeleton';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { DoveAnimation } from '../../src/components/church/DoveAnimation';
import { prayerRequestsApi, PrayerRequest } from '../../src/api/prayerRequests';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole, useUser } from '../../src/store/authStore';
import { confirmDelete } from '../../src/utils/confirmDelete';
import { PAGE_SIZE } from '../../src/utils/constants';

const LEADERS = ['PASTOR', 'ELDER'];

export default function PrayerRequestsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const user = useUser();
  const queryClient = useQueryClient();

  const isLeader = role ? LEADERS.includes(role) : false;

  const [responding, setResponding] = useState<PrayerRequest | null>(null);
  const [responseText, setResponseText] = useState('');

  const query = useInfiniteQuery({
    queryKey: ['prayer-requests'],
    queryFn: ({ pageParam = 0 }) => prayerRequestsApi.list({ page: pageParam, size: PAGE_SIZE }),
    getNextPageParam: (last) => (last.number + 1 < last.totalPages ? last.number + 1 : undefined),
    initialPageParam: 0,
  });

  const prayers: PrayerRequest[] = query.data?.pages?.flatMap((p) => p.content) ?? [];
  const openCount = prayers.filter((p) => p.status === 'OPEN').length;

  const { mutate: respond, isPending: respondPending } = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) =>
      prayerRequestsApi.respond(id, { response }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-requests'] });
      haptics.success();
      setResponding(null);
      setResponseText('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not send your response. Please try again.');
      haptics.error();
    },
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id: string) => prayerRequestsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-requests'] });
      haptics.success();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not delete this prayer request.');
      haptics.error();
    },
  });

  const handleDelete = (prayer: PrayerRequest) => {
    confirmDelete({
      title: 'Delete prayer request?',
      message: 'This will remove the request for everyone. This cannot be undone.',
      onConfirm: () => remove(prayer.id),
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <WatermarkBackground
        imageSource={ScreenPhotos.prayer}
        overlayOpacity={0.58}
        overlayColor="#1A0533"
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Prayer Wall</Text>
            <Text style={styles.headerSub}>
              {openCount > 0
                ? `${openCount} request${openCount !== 1 ? 's' : ''} awaiting prayer`
                : 'Bring your requests before God together'}
            </Text>
          </View>
          <DoveAnimation size={36} style={styles.headerDove} />
        </View>
      </WatermarkBackground>

      {query.isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 6 }, (_, i) => <AnnouncementSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={prayers}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <PrayerCard
              prayer={item}
              index={index}
              canRespond={isLeader}
              canDelete={isLeader || item.memberId === user?.id}
              onRespond={() => { setResponding(item); setResponseText(''); }}
              onDelete={() => handleDelete(item)}
            />
          )}
          onEndReached={() =>
            query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()
          }
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={query.refetch}
              tintColor={Colors.gold}
            />
          }
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: 120 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <DoveAnimation size={60} color={Colors.gold} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No prayer requests yet.{'\n'}Be the first to share one.
              </Text>
            </View>
          }
        />
      )}

      {/* Submit FAB — every member can share a request */}
      <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          onPress={() => { haptics.medium(); router.push('/prayer/new'); }}
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel="Share a prayer request"
        >
          <LinearGradient colors={Gradients.glory} style={styles.fabGradient}>
            <Text style={styles.fabText}>🙏 Share Request</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Respond modal — Pastor / Elder only */}
      <Modal
        visible={responding !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setResponding(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />

            <Text style={styles.modalTitle} numberOfLines={2}>
              Respond to "{responding?.title}"
            </Text>
            <Text style={styles.modalSub}>
              Your response marks this request as answered and is visible to the requester.
            </Text>

            <KlinkInput
              label="Your response"
              value={responseText}
              onChangeText={setResponseText}
              multiline
              numberOfLines={4}
              style={styles.modalInput}
              autoCapitalize="sentences"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { haptics.light(); setResponding(null); }}
                style={styles.modalCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.modalSubmit}>
                <KlinkButton
                  label="Send Response"
                  onPress={() => {
                    if (!responseText.trim() || !responding) return;
                    respond({ id: responding.id, response: responseText.trim() });
                  }}
                  disabled={!responseText.trim() || respondPending}
                  loading={respondPending}
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
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTextWrap: { flex: 1, gap: 4 },
  headerTitle: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  headerDove: { marginRight: -Spacing.md },
  empty: { padding: Spacing.xxxl, alignItems: 'center', gap: Spacing.md },
  emptyText: { fontSize: FontSize.body, textAlign: 'center', lineHeight: 24 },
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
  modalSub: { color: Colors.darkMuted, fontSize: FontSize.small, lineHeight: 20 },
  modalInput: { minHeight: 90, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  modalCancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  modalCancelText: { color: Colors.darkMuted, fontSize: FontSize.body, fontWeight: FontWeight.medium },
  modalSubmit: { flex: 1 },
});
