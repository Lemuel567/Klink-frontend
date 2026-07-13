import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
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
  // Detail sheet — the old in-card expansion was invisible for short prayers,
  // so tapping "did nothing"; now every tap opens this full-detail sheet.
  const [viewing, setViewing] = useState<PrayerRequest | null>(null);
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
              onOpen={() => setViewing(item)}
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

      {/* Detail sheet — slides up on card tap; full content, no truncation */}
      <Modal
        visible={viewing !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setViewing(null)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setViewing(null)} accessibilityLabel="Close" />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.sheetGlass]} />
            <View style={styles.sheetHandle} />

            {viewing && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
                <View style={styles.sheetHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetAuthor}>
                      {viewing.memberName ?? 'A member'}
                    </Text>
                    <Text style={styles.sheetDate}>
                      {new Date(viewing.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.sheetBadge,
                      { borderColor: viewing.visibility === 'PRIVATE' ? Colors.purpleLight : Colors.gold },
                    ]}
                  >
                    <Text
                      style={{
                        color: viewing.visibility === 'PRIVATE' ? Colors.purpleLight : Colors.gold,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      }}
                    >
                      {viewing.visibility}
                    </Text>
                  </View>
                </View>

                <Text style={styles.sheetTitle}>{viewing.title}</Text>
                <Text style={styles.sheetContent}>{viewing.content}</Text>

                {viewing.status === 'ANSWERED' && viewing.leaderResponse ? (
                  <View style={styles.sheetResponse}>
                    <Text style={{ color: Colors.green, fontWeight: FontWeight.bold, fontSize: FontSize.small }}>
                      🙏 Answered by your leaders
                    </Text>
                    <Text style={styles.sheetResponseText}>{viewing.leaderResponse}</Text>
                  </View>
                ) : null}

                <View style={styles.sheetActions}>
                  <TouchableOpacity
                    onPress={async () => {
                      haptics.light();
                      try {
                        await Share.share({
                          message: `Please pray with me:\n\n${viewing.title}\n\n${viewing.content}\n\n— shared from Klink`,
                        });
                      } catch { /* dismissed */ }
                    }}
                    style={styles.sheetActionBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Share this prayer request"
                  >
                    <Text style={styles.sheetActionText}>Share</Text>
                  </TouchableOpacity>
                  {isLeader && viewing.status !== 'ANSWERED' && (
                    <TouchableOpacity
                      onPress={() => {
                        haptics.medium();
                        const p = viewing;
                        setViewing(null);
                        setResponding(p);
                        setResponseText('');
                      }}
                      style={[styles.sheetActionBtn, { borderColor: Colors.gold }]}
                      accessibilityRole="button"
                      accessibilityLabel="Respond and mark answered"
                    >
                      <Text style={[styles.sheetActionText, { color: Colors.gold }]}>Respond</Text>
                    </TouchableOpacity>
                  )}
                  {(isLeader || viewing.memberId === user?.id) && (
                    <TouchableOpacity
                      onPress={() => {
                        const p = viewing;
                        setViewing(null);
                        handleDelete(p);
                      }}
                      style={[styles.sheetActionBtn, { borderColor: 'rgba(220,38,38,0.6)' }]}
                      accessibilityRole="button"
                      accessibilityLabel="Delete this prayer request"
                    >
                      <Text style={[styles.sheetActionText, { color: Colors.red }]}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
  // Detail bottom sheet
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  sheetGlass: {
    backgroundColor: 'rgba(26,19,64,0.94)',
    borderTopWidth: 1,
    borderColor: 'rgba(244,164,41,0.25)',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: Spacing.md,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  sheetAuthor: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.bold },
  sheetDate: { color: 'rgba(255,255,255,0.45)', fontSize: FontSize.caption, marginTop: 2 },
  sheetBadge: {
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sheetTitle: {
    color: Colors.white,
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
    lineHeight: FontSize.h3 * 1.25,
  },
  sheetContent: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.body,
    lineHeight: FontSize.body * 1.7,
    marginBottom: Spacing.md,
  },
  sheetResponse: {
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 4,
    marginBottom: Spacing.md,
  },
  sheetResponseText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSize.small,
    lineHeight: FontSize.small * 1.6,
  },
  sheetActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  sheetActionBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 99,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetActionText: { color: Colors.white, fontSize: FontSize.small, fontWeight: FontWeight.bold },

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
