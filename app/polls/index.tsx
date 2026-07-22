import React, { useEffect, useState } from 'react';
import {
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
import { confirmDelete } from '../../src/utils/confirmDelete';
import { pollsApi, Poll } from '../../src/api/polls';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Duration, EasingPresets, StaggerDelay } from '../../src/theme/animations';
import { PAGE_SIZE } from '../../src/utils/constants';

// Backend: create = Pastor or Manager ONLY; delete = Pastor, Elder, Manager.
// Everyone votes (once, enforced server-side) and everyone sees results.
// Polls are IMMUTABLE once created — no edit endpoint exists, by design.
const CAN_CREATE = ['PASTOR', 'MANAGER'];
const CAN_DELETE = ['PASTOR', 'ELDER', 'MANAGER'];

export default function PollsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();

  const canCreate = role ? CAN_CREATE.includes(role) : false;
  const canDelete = role ? CAN_DELETE.includes(role) : false;

  const [composing, setComposing] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);

  const query = useInfiniteQuery({
    queryKey: ['polls'],
    queryFn: ({ pageParam = 0 }) => pollsApi.getAll({ page: pageParam, size: PAGE_SIZE }),
    getNextPageParam: (last) => (last.number + 1 < last.totalPages ? last.number + 1 : undefined),
    initialPageParam: 0,
  });

  const polls: Poll[] = query.data?.pages.flatMap((p) => p.content) ?? [];

  const { mutate: vote, isPending: voting } = useMutation({
    mutationFn: ({ pollId, option }: { pollId: string; option: string }) =>
      pollsApi.vote(pollId, option),
    onSuccess: (_data, { pollId }) => {
      // Mark this poll voted in the cache immediately — the options must lock
      // the instant the vote lands, not after the list refetch completes.
      queryClient.setQueryData(['polls'], (old: any) =>
        old
          ? {
              ...old,
              pages: old.pages.map((pg: any) => ({
                ...pg,
                content: pg.content.map((p: Poll) =>
                  p.id === pollId ? { ...p, voted: true } : p,
                ),
              })),
            }
          : old,
      );
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      // Fresh counts for the result bars that appear right after voting
      queryClient.invalidateQueries({ queryKey: ['poll-results', pollId] });
      haptics.success();
    },
    onError: (err: any) => {
      Alert.alert('Could not vote', err?.friendlyMessage ?? 'Please try again.');
      haptics.error();
    },
  });

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: () =>
      pollsApi.create({
        question: question.trim(),
        options: options.map((o) => o.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      haptics.success();
      setComposing(false);
      setQuestion('');
      setOptions(['', '']);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not create the poll.');
      haptics.error();
    },
  });

  const { mutate: remove } = useMutation({
    mutationFn: (pollId: string) => pollsApi.delete(pollId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      haptics.success();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not delete the poll.');
      haptics.error();
    },
  });

  const confirmVote = (poll: Poll, option: string) => {
    haptics.light();
    Alert.alert('Cast your vote?', `“${option}” — you can only vote once.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Vote', onPress: () => vote({ pollId: poll.id, option }) },
    ]);
  };

  const validOptions = options.map((o) => o.trim()).filter(Boolean);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient colors={Gradients.heaven} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Polls</Text>
        <Text style={styles.headerSub}>Your voice in church decisions</Text>
      </LinearGradient>

      {query.isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 4 }, (_, i) => <AnnouncementSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={polls}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ScrollReveal delay={index * StaggerDelay.list} style={styles.cardWrap}>
              <KlinkCard style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={[styles.question, { color: theme.text }]}>{item.question}</Text>
                  <View
                    style={[
                      styles.stateBadge,
                      { backgroundColor: item.open ? 'rgba(34,197,94,0.15)' : 'rgba(139,143,168,0.15)' },
                    ]}
                  >
                    <Text style={[styles.stateText, { color: item.open ? Colors.success : Colors.darkMuted }]}>
                      {item.open ? 'Open' : 'Closed'}
                    </Text>
                  </View>
                </View>

                {item.voted || !item.open ? (
                  // Voted or closed → read-only results with animated fill bars
                  <PollResults poll={item} />
                ) : (
                  item.options.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      disabled={voting}
                      onPress={() => confirmVote(item, opt)}
                      style={styles.option}
                      activeOpacity={0.6}
                      accessibilityRole="button"
                      accessibilityLabel={`Vote for ${opt}`}
                    >
                      <Text style={[styles.optionText, { color: theme.text }]}>{opt}</Text>
                    </TouchableOpacity>
                  ))
                )}

                <View style={styles.cardFooter}>
                  {item.voted ? (
                    <Text style={[styles.votedText, { color: Colors.success }]}>✓ You voted</Text>
                  ) : !item.open ? (
                    <Text style={[styles.votedText, { color: theme.textMuted }]}>Voting closed</Text>
                  ) : (
                    <Text style={[styles.votedText, { color: theme.textMuted }]}>Tap an option to vote</Text>
                  )}
                  {canDelete && (
                    <View style={styles.manageRow}>
                      <TouchableOpacity
                        onPress={() =>
                          confirmDelete({
                            title: 'Delete this poll?',
                            message: 'All votes will be removed too.',
                            onConfirm: () => remove(item.id),
                          })
                        }
                        style={styles.manageLink}
                        accessibilityRole="button"
                        accessibilityLabel="Delete poll"
                      >
                        <Text style={[styles.manageLinkText, { color: Colors.red }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </KlinkCard>
            </ScrollReveal>
          )}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={Colors.gold} />
          }
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: canCreate ? 120 : 100 }}
          ListEmptyComponent={
            <EmptyState
              icon="🗳"
              title="No polls yet"
              subtitle={canCreate ? 'Ask your congregation a question.' : 'Polls will appear here when leadership opens one.'}
              actionLabel={canCreate ? '+ New poll' : undefined}
              onAction={canCreate ? () => setComposing(true) : undefined}
            />
          }
        />
      )}

      {/* Create FAB — Pastor / Manager ONLY */}
      {canCreate && (
        <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            onPress={() => { haptics.medium(); setComposing(true); }}
            style={styles.fab}
            accessibilityRole="button"
            accessibilityLabel="Create a poll"
          >
            <LinearGradient colors={Gradients.glory} style={styles.fabGradient}>
              <Text style={styles.fabText}>+ New poll</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Create modal */}
      <Modal
        visible={composing}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!creating) setComposing(false); }}
      >
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />
            <Text style={styles.modalTitle}>New poll</Text>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
            >
              <KlinkInput
                label="Question"
                value={question}
                onChangeText={setQuestion}
                autoCapitalize="sentences"
                maxLength={300}
                editable={!creating}
              />

              <Text style={styles.optionsLabel}>OPTIONS (2–10)</Text>
              {options.map((opt, i) => (
                <View key={i} style={styles.optionInputRow}>
                  <View style={{ flex: 1 }}>
                    <KlinkInput
                      label={`Option ${i + 1}`}
                      value={opt}
                      onChangeText={(text) =>
                        setOptions((prev) => prev.map((o, j) => (j === i ? text : o)))
                      }
                      maxLength={200}
                      containerStyle={{ marginBottom: Spacing.sm }}
                      editable={!creating}
                    />
                  </View>
                  {options.length > 2 && (
                    <TouchableOpacity
                      disabled={creating}
                      onPress={() => {
                        haptics.light();
                        setOptions((prev) => prev.filter((_, j) => j !== i));
                      }}
                      style={[styles.removeOption, creating && styles.frozen]}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove option ${i + 1}`}
                    >
                      <Text style={styles.removeOptionText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {options.length < 10 && (
                <TouchableOpacity
                  disabled={creating}
                  onPress={() => { haptics.light(); setOptions((prev) => [...prev, '']); }}
                  style={[styles.addOption, creating && styles.frozen]}
                  accessibilityRole="button"
                  accessibilityLabel="Add another option"
                >
                  <Text style={styles.addOptionText}>+ Add option</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                disabled={creating}
                onPress={() => { haptics.light(); setComposing(false); }}
                style={[styles.modalCancel, creating && styles.frozen]}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <KlinkButton
                  label="Create Poll"
                  onPress={() => { if (question.trim() && validOptions.length >= 2) create(); }}
                  disabled={!question.trim() || validOptions.length < 2 || creating}
                  loading={creating}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

// ─── Inline results — EVERYONE sees these once they voted or the poll closed ──
// Read-only by construction: only aggregate counts/percentages come from the
// server, and there is no way to alter them from the client.
function PollResults({ poll }: { poll: Poll }) {
  const { theme } = useTheme();
  const { data } = useQuery({
    queryKey: ['poll-results', poll.id],
    queryFn: () => pollsApi.getResults(poll.id),
    // Light polling keeps the numbers live while voting is still open
    refetchInterval: poll.open ? 30_000 : false,
  });

  if (!data) {
    return <Text style={[styles.votedText, { color: theme.textMuted }]}>Loading results…</Text>;
  }

  return (
    <View style={{ gap: Spacing.sm }}>
      <Text style={[styles.voterCount, { color: theme.textMuted }]}>
        {data.totalVotes} {data.totalVotes === 1 ? 'MEMBER HAS' : 'MEMBERS HAVE'} VOTED
      </Text>
      {data.results.map((r, i) => (
        <ResultRow key={r.option} option={r.option} votes={r.votes} percentage={r.percentage} index={i} />
      ))}
    </View>
  );
}

// One option row — the gold bar fills smoothly to its percentage, staggered
// per row, on first appearance AND whenever the live numbers change.
function ResultRow({ option, votes, percentage, index }: {
  option: string;
  votes: number;
  percentage: number;
  index: number;
}) {
  const { theme } = useTheme();
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withDelay(
      index * StaggerDelay.list,
      withTiming(percentage, { duration: Duration.verySlow, easing: EasingPresets.enter }),
    );
  }, [percentage, index]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value}%` }));

  return (
    <View style={styles.resultItem}>
      <View style={styles.resultLabelRow}>
        <Text style={[styles.resultOption, { color: theme.text }]} numberOfLines={1}>{option}</Text>
        <Text style={styles.resultPct}>{percentage}% · {votes}</Text>
      </View>
      <View style={styles.resultTrack}>
        <Animated.View style={[styles.resultFill, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.lg, gap: 4 },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  headerTitle: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.tight },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  cardWrap: { marginHorizontal: Spacing.pagePadding, marginBottom: Spacing.sm },
  card: { gap: Spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  question: { flex: 1, fontSize: FontSize.body, fontWeight: FontWeight.semiBold, lineHeight: FontSize.body * 1.4 },
  stateBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  stateText: { fontSize: FontSize.caption, fontWeight: FontWeight.semiBold },
  option: {
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.35)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  optionDisabled: { borderColor: 'rgba(255,255,255,0.1)', opacity: 0.7 },
  optionText: { fontSize: FontSize.small, fontWeight: FontWeight.medium },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  votedText: { fontSize: FontSize.caption, fontWeight: FontWeight.medium },
  manageRow: { flexDirection: 'row', gap: Spacing.md },
  manageLink: { minHeight: 32, justifyContent: 'center' },
  manageLinkText: { color: Colors.gold, fontSize: FontSize.caption, fontWeight: FontWeight.bold },
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
  modalScroll: { maxHeight: 420 },
  optionsLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wider,
    marginBottom: Spacing.sm,
  },
  optionInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  removeOption: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  removeOptionText: { color: Colors.red, fontSize: 16, fontWeight: FontWeight.bold },
  addOption: { minHeight: 44, justifyContent: 'center' },
  addOptionText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.bold },
  frozen: { opacity: 0.4 },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  modalCancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  modalCancelText: { color: Colors.darkMuted, fontSize: FontSize.body, fontWeight: FontWeight.medium },
  voterCount: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wider,
  },
  resultItem: { gap: 4 },
  resultLabelRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  resultOption: { color: Colors.white, fontSize: FontSize.small, flex: 1 },
  resultPct: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  resultTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  resultFill: { height: 8, borderRadius: 4, backgroundColor: Colors.gold },
});
