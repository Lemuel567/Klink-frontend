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
import { PhotoHeader } from "../../src/components/common/PhotoHeader";
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
import { TypewriterText } from '../../src/components/animations/TypewriterText';

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
  // The poll whose full detail/results sheet is open (via the "Open" tag)
  const [detailPoll, setDetailPoll] = useState<Poll | null>(null);

  const query = useInfiniteQuery({
    queryKey: ['polls'],
    queryFn: ({ pageParam = 0 }) => pollsApi.getAll({ page: pageParam, size: PAGE_SIZE }),
    getNextPageParam: (last) => (last.number + 1 < last.totalPages ? last.number + 1 : undefined),
    initialPageParam: 0,
  });

  const polls: Poll[] = query.data?.pages.flatMap((p) => p.content) ?? [];

  // Which poll is mid-vote — so only that card's options disable, not all polls
  const [votingPollId, setVotingPollId] = useState<string | null>(null);

  const { mutate: vote } = useMutation({
    mutationFn: ({ pollId, option }: { pollId: string; option: string }) =>
      pollsApi.vote(pollId, option),
    onMutate: ({ pollId, option }) => {
      setVotingPollId(pollId);
      // Snapshot BEFORE the optimistic write — if the vote fails (especially
      // offline, where the "rollback by refetch" also fails), we restore this
      // instead of leaving a phantom "✓ Voted" the server never recorded.
      const previous = queryClient.getQueryData(['polls']);
      // Reflect the choice instantly — mark voted and record WHICH option, so
      // the row highlights and the footer updates before the refetch lands.
      queryClient.setQueryData(['polls'], (old: any) =>
        old
          ? {
              ...old,
              pages: old.pages.map((pg: any) => ({
                ...pg,
                content: pg.content.map((p: Poll) =>
                  p.id === pollId ? { ...p, voted: true, votedOption: option } : p,
                ),
              })),
            }
          : old,
      );
      return { previous };
    },
    onSuccess: (_data, { pollId }) => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      // Fresh counts for the result bars
      queryClient.invalidateQueries({ queryKey: ['poll-results', pollId] });
      haptics.success();
    },
    onError: (err: any, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['polls'], context.previous);
      }
      Alert.alert('Could not vote', err?.friendlyMessage ?? 'Please try again.');
      haptics.error();
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
    onSettled: () => setVotingPollId(null),
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

  // Tap to vote — or tap a different option to change an existing vote. No
  // confirm dialog: changing is meant to be easy, and the highlight + haptic
  // are feedback enough.
  const castVote = (poll: Poll, option: string) => {
    if (poll.votedOption === option) return; // already your choice — no-op
    haptics.light();
    vote({ pollId: poll.id, option });
  };

  const validOptions = options.map((o) => o.trim()).filter(Boolean);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PhotoHeader style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
         
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <TypewriterText text="Polls" style={styles.headerTitle} charDelayMs={42} />
        <Text style={styles.headerSub}>Your voice in church decisions</Text>
      </PhotoHeader>

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
                  {/* Tap "Open" to see the full detailed results in a sheet */}
                  <TouchableOpacity
                    onPress={() => { haptics.light(); setDetailPoll(item); }}
                    style={[
                      styles.stateBadge,
                      { backgroundColor: item.open ? 'rgba(34,197,94,0.15)' : 'rgba(139,143,168,0.15)' },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Open full results for: ${item.question}`}
                  >
                    <Text style={[styles.stateText, { color: item.open ? Colors.success : Colors.darkMuted }]}>
                      {item.open ? 'Open' : 'Closed'} ›
                    </Text>
                  </TouchableOpacity>
                </View>

                <PollBody
                  poll={item}
                  voting={votingPollId === item.id}
                  onVote={(opt) => castVote(item, opt)}
                />

                <View style={styles.cardFooter}>
                  {!item.open ? (
                    <Text style={[styles.votedText, { color: theme.textMuted }]}>Voting closed</Text>
                  ) : item.voted ? (
                    <Text style={[styles.votedText, { color: Colors.success }]}>
                      ✓ Voted — tap another to change
                    </Text>
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

      {/* Detail / results sheet — opened by the "Open" tag on a poll */}
      {detailPoll && (
        <PollDetailModal poll={detailPoll} onClose={() => setDetailPoll(null)} />
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

// ─── Poll detail sheet — full results, opened by the "Open" tag ───────────────
// A slide-up sheet showing the total number of voters and, for every option,
// a full-width bar with its percentage and vote count — the "in detail" view.
function PollDetailModal({ poll, onClose }: { poll: Poll; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['poll-results', poll.id],
    queryFn: () => pollsApi.getResults(poll.id),
    // Live while the poll is still open
    refetchInterval: poll.open ? 15_000 : false,
  });

  const total = data?.totalVotes ?? 0;
  // Highlight the leading option(s)
  const topVotes = data ? Math.max(0, ...data.results.map((r) => r.votes)) : 0;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.detailBackdrop}>
        <View style={[styles.detailSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.detailGlass]} />

          <View style={styles.detailGrabber} />

          <View style={styles.detailHeader}>
            <View
              style={[
                styles.stateBadge,
                { backgroundColor: poll.open ? 'rgba(34,197,94,0.15)' : 'rgba(139,143,168,0.15)' },
              ]}
            >
              <Text style={[styles.stateText, { color: poll.open ? Colors.success : Colors.darkMuted }]}>
                {poll.open ? 'Open' : 'Closed'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => { haptics.light(); onClose(); }}
              style={styles.detailClose}
              accessibilityRole="button"
              accessibilityLabel="Close results"
            >
              <Text style={styles.detailCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.detailQuestion}>{poll.question}</Text>
          <Text style={styles.detailTotal}>
            {isLoading
              ? 'Loading results…'
              : `${total} ${total === 1 ? 'member has' : 'members have'} voted`}
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.detailScroll}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />
            }
          >
            {isError ? (
              <View style={styles.detailErrorWrap}>
                <Text style={styles.detailErrorText}>Couldn't load the results.</Text>
                <TouchableOpacity onPress={() => refetch()} style={styles.detailRetry} accessibilityRole="button" accessibilityLabel="Try again">
                  <Text style={styles.manageLinkText}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              poll.options.map((opt) => {
                const r = data?.results.find((x) => x.option === opt);
                const votes = r?.votes ?? 0;
                const pct = r?.percentage ?? 0;
                const leading = !!data && total > 0 && votes === topVotes;
                return (
                  <View key={opt} style={styles.detailRow}>
                    <View style={styles.detailRowTop}>
                      <Text
                        style={[styles.detailOption, leading && styles.detailOptionLeading]}
                        numberOfLines={2}
                      >
                        {leading ? '★ ' : ''}{opt}
                      </Text>
                      <Text style={[styles.detailPct, leading && styles.detailOptionLeading]}>
                        {pct}%
                      </Text>
                    </View>
                    <View style={styles.detailTrack}>
                      <View
                        style={[
                          styles.detailFill,
                          { width: `${Math.max(pct, 1.5)}%` },
                          leading && styles.detailFillLeading,
                        ]}
                      />
                    </View>
                    <Text style={styles.detailVotes}>
                      {votes} {votes === 1 ? 'vote' : 'votes'}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Poll body — voter count + one bar per option ─────────────────────────────
// EVERYONE sees the number of voters and each option's percentage. While the
// poll is OPEN, every bar is tappable: tap to vote, or tap a different bar to
// change your vote. The option you currently hold is highlighted with a ✓.
function PollBody({
  poll,
  voting,
  onVote,
}: {
  poll: Poll;
  voting: boolean;
  onVote: (option: string) => void;
}) {
  const { theme } = useTheme();
  const { data, isError, refetch, isRefetching } = useQuery({
    queryKey: ['poll-results', poll.id],
    queryFn: () => pollsApi.getResults(poll.id),
    // Keep the numbers live while voting is still open
    refetchInterval: poll.open ? 20_000 : false,
  });

  const countFor = (opt: string) => data?.results.find((r) => r.option === opt);
  const totalVotes = data?.totalVotes ?? 0;

  return (
    <View style={{ gap: Spacing.sm }}>
      <Text style={[styles.voterCount, { color: theme.textMuted }]}>
        {data
          ? `${totalVotes} ${totalVotes === 1 ? 'MEMBER HAS' : 'MEMBERS HAVE'} VOTED`
          : 'LOADING RESULTS…'}
      </Text>

      {poll.options.map((opt, i) => {
        const r = countFor(opt);
        const row = (
          <PollOptionRow
            option={opt}
            percentage={r?.percentage ?? 0}
            votes={r?.votes ?? 0}
            mine={poll.votedOption === opt}
            showResults={!!data}
            index={i}
          />
        );
        // Open poll → tappable (vote / change). Closed → read-only.
        return poll.open ? (
          <TouchableOpacity
            key={opt}
            disabled={voting}
            activeOpacity={0.7}
            onPress={() => onVote(opt)}
            accessibilityRole="button"
            accessibilityLabel={
              poll.votedOption === opt ? `Your vote: ${opt}` : `Vote for ${opt}`
            }
          >
            {row}
          </TouchableOpacity>
        ) : (
          <View key={opt}>{row}</View>
        );
      })}

      {isError && (
        <View style={styles.resultsErrorRow}>
          <Text style={[styles.votedText, { color: theme.textMuted, flex: 1 }]} numberOfLines={2}>
            Couldn't load the latest counts.
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            disabled={isRefetching}
            style={styles.retryLink}
            accessibilityRole="button"
            accessibilityLabel="Retry loading results"
          >
            <Text style={styles.manageLinkText}>{isRefetching ? 'Retrying…' : 'Try again'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// One option: a bordered pill with a gold fill bar behind the label. The fill
// animates to the option's percentage (staggered) once results arrive; before
// then the pill is plain so voting is never blocked on the results loading.
// `mine` (the caller's current choice) gets a stronger gold border + a ✓.
function PollOptionRow({
  option,
  percentage,
  votes,
  mine,
  showResults,
  index,
}: {
  option: string;
  percentage: number;
  votes: number;
  mine: boolean;
  showResults: boolean;
  index: number;
}) {
  const { theme } = useTheme();
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withDelay(
      index * StaggerDelay.list,
      withTiming(showResults ? percentage : 0, {
        duration: Duration.verySlow,
        easing: EasingPresets.enter,
      }),
    );
  }, [percentage, showResults, index]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value}%` }));

  return (
    <View style={[styles.pollOption, mine && styles.pollOptionMine]}>
      {showResults && (
        <Animated.View
          style={[styles.pollOptionFill, mine && styles.pollOptionFillMine, fillStyle]}
        />
      )}
      <View style={styles.pollOptionRow}>
        <Text
          style={[styles.optionText, { color: theme.text }, mine && styles.optionTextMine]}
          numberOfLines={1}
        >
          {mine ? '✓ ' : ''}
          {option}
        </Text>
        {showResults && (
          <Text style={styles.resultPct}>
            {percentage}% · {votes}
          </Text>
        )}
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
  // Combined vote + result pill: bordered row, gold fill bar behind the label
  pollOption: {
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.35)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    minHeight: 46,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  pollOptionMine: {
    borderColor: Colors.gold,
    borderWidth: 1.5,
  },
  pollOptionFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(244,164,41,0.14)',
  },
  pollOptionFillMine: {
    backgroundColor: 'rgba(244,164,41,0.28)',
  },
  pollOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  optionText: { flex: 1, fontSize: FontSize.small, fontWeight: FontWeight.medium },
  optionTextMine: { fontWeight: FontWeight.semiBold },
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
  resultsErrorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  retryLink: { minHeight: 32, justifyContent: 'center' },
  resultItem: { gap: 4 },
  resultLabelRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  resultOption: { color: Colors.white, fontSize: FontSize.small, flex: 1 },
  resultPct: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  resultTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  resultFill: { height: 8, borderRadius: 4, backgroundColor: Colors.gold },

  // ── Detail / results sheet ──────────────────────────────────────────────────
  detailBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  detailSheet: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    overflow: 'hidden',
    paddingHorizontal: Spacing.pagePadding,
    paddingTop: Spacing.sm,
    maxHeight: '85%',
  },
  detailGlass: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    backgroundColor: 'rgba(26,31,62,0.94)',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  detailGrabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: Spacing.md,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailClose: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  detailCloseText: { color: 'rgba(255,255,255,0.7)', fontSize: 18, fontWeight: FontWeight.bold },
  detailQuestion: {
    color: Colors.white,
    fontSize: FontSize.h4,
    fontWeight: FontWeight.bold,
    lineHeight: FontSize.h4 * 1.3,
    marginTop: Spacing.sm,
  },
  detailTotal: {
    color: Colors.gold,
    fontSize: FontSize.small,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wide,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  detailScroll: { flexGrow: 0 },
  detailRow: { marginBottom: Spacing.md, gap: 6 },
  detailRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  detailOption: { flex: 1, color: '#F5F0FF', fontSize: FontSize.body, fontWeight: FontWeight.medium },
  detailOptionLeading: { color: Colors.gold, fontWeight: FontWeight.bold },
  detailPct: { color: '#F5F0FF', fontSize: FontSize.body, fontWeight: FontWeight.bold },
  detailTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  detailFill: { height: 12, borderRadius: 6, backgroundColor: 'rgba(244,164,41,0.55)' },
  detailFillLeading: { backgroundColor: Colors.gold },
  detailVotes: { color: 'rgba(245,240,255,0.6)', fontSize: FontSize.caption },
  detailErrorWrap: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  detailErrorText: { color: 'rgba(245,240,255,0.7)', fontSize: FontSize.small },
  detailRetry: { minHeight: 44, justifyContent: 'center' },
});
