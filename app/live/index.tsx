import React, { useState } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';
import { BlurView } from 'expo-blur';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PhotoHeader } from '../../src/components/common/PhotoHeader';
import { TypewriterText } from '../../src/components/animations/TypewriterText';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { EmptyState } from '../../src/components/common/EmptyState';
import { liveStreamsApi, LiveStream } from '../../src/api/liveStreams';
import { Colors } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import { confirmDelete } from '../../src/utils/confirmDelete';
import { formatRelativeTime } from '../../src/utils/formatters';
import { StaggerDelay } from '../../src/theme/animations';

const LEADER_ROLES = ['PASTOR', 'ELDER', 'MANAGER'];

/**
 * Facebook has no player library for React Native, so its official embed plugin
 * is loaded in a WebView. It only renders PUBLIC videos — a stream posted to a
 * private group or restricted page will show Facebook's own error inside the box.
 */
function FacebookPlayer({ url, width, height }: { url: string; width: number; height: number }) {
  const src =
    'https://www.facebook.com/plugins/video.php?href=' +
    encodeURIComponent(url) +
    `&show_text=false&width=${width}&height=${height}`;

  return (
    <WebView
      source={{ uri: src }}
      style={{ width, height, backgroundColor: '#000' }}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      allowsFullscreenVideo
      originWhitelist={['*']}
      // Keep the embed inside the box — taps on Facebook chrome must not
      // navigate the WebView away to a login/feed page.
      setSupportMultipleWindows={false}
    />
  );
}

export default function LiveScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();

  const isLeader = role ? LEADER_ROLES.includes(role) : false;

  // 16:9 player sized to the card it sits in.
  const playerWidth = Math.round(width - Spacing.pagePadding * 2);
  const playerHeight = Math.round((playerWidth * 9) / 16);

  // Which past broadcast the member chose to re-watch (null = show the live one).
  const [replaying, setReplaying] = useState<LiveStream | null>(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [streamUrl, setStreamUrl] = useState('');

  const currentQuery = useQuery({
    queryKey: ['live-streams', 'current'],
    queryFn: liveStreamsApi.getCurrent,
    // Members sitting on this screen should see the stream appear without
    // pulling to refresh. One tiny request a minute is cheap.
    refetchInterval: 60_000,
  });

  const listQuery = useQuery({
    queryKey: ['live-streams', 'list'],
    queryFn: () => liveStreamsApi.list({ size: 20 }),
  });

  const current = currentQuery.data ?? null;
  const showing = replaying ?? current;
  const past = (listQuery.data?.content ?? []).filter((s) => s.id !== current?.id);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['live-streams'] });
  };

  const { mutate: goLive, isPending: starting } = useMutation({
    mutationFn: () => liveStreamsApi.start({ title: title.trim(), streamUrl: streamUrl.trim() }),
    onSuccess: () => {
      haptics.success();
      setComposeOpen(false);
      setTitle('');
      setStreamUrl('');
      setReplaying(null);
      refreshAll();
    },
    onError: (err: any) => {
      haptics.error();
      Alert.alert('Could not go live', err?.friendlyMessage ?? 'Please check the link and try again.');
    },
  });

  const { mutate: endStream, isPending: ending } = useMutation({
    mutationFn: (id: string) => liveStreamsApi.end(id),
    onSuccess: () => {
      haptics.success();
      refreshAll();
    },
    onError: (err: any) => {
      haptics.error();
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not end the stream.');
    },
  });

  const { mutate: removeStream } = useMutation({
    mutationFn: (id: string) => liveStreamsApi.remove(id),
    onSuccess: () => {
      haptics.success();
      refreshAll();
    },
    onError: (err: any) => {
      haptics.error();
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not delete this stream.');
    },
  });

  const confirmEnd = (stream: LiveStream) => {
    Alert.alert(
      'End the broadcast?',
      'Members will stop seeing the "Live now" badge. The recording stays available.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End stream', style: 'destructive', onPress: () => endStream(stream.id) },
      ],
    );
  };

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
        <Text style={styles.eyebrow}>{current ? '🔴 LIVE NOW' : 'BROADCASTS'}</Text>
        <TypewriterText text="Live" style={styles.headerTitle} charDelayMs={60} />
        <Text style={styles.headerSub}>
          {current ? current.title : 'Watch your church service, live and on demand'}
        </Text>
      </PhotoHeader>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Spacing.pagePadding, paddingBottom: insets.bottom + 96, gap: Spacing.md }}
        refreshControl={
          <RefreshControl
            refreshing={currentQuery.isRefetching || listQuery.isRefetching}
            onRefresh={refreshAll}
            tintColor={Colors.gold}
          />
        }
      >
        {/* ── Player ────────────────────────────────────────────────────── */}
        {showing ? (
          <ScrollReveal delay={0}>
            <View style={[styles.playerCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.playerFrame}>
                {showing.provider === 'FACEBOOK' ? (
                  <FacebookPlayer url={showing.sourceRef} width={playerWidth} height={playerHeight} />
                ) : (
                  <YoutubePlayer
                    height={playerHeight}
                    width={playerWidth}
                    videoId={showing.sourceRef}
                    play={false}
                  />
                )}
              </View>

              <View style={styles.playerMeta}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.playerTitle, { color: theme.text }]} numberOfLines={2}>
                    {showing.title}
                  </Text>
                  <Text style={[styles.playerWhen, { color: theme.textMuted }]}>
                    {showing.status === 'LIVE' && !replaying
                      ? 'Streaming now'
                      : `Streamed ${formatRelativeTime(showing.startedAt)}`}
                  </Text>
                </View>
                {showing.status === 'LIVE' && !replaying ? (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                ) : null}
              </View>

              {replaying ? (
                <TouchableOpacity
                  onPress={() => { haptics.light(); setReplaying(null); }}
                  accessibilityRole="button"
                  accessibilityLabel="Back to the live broadcast"
                >
                  <Text style={styles.backToLive}>
                    {current ? '← Back to the live broadcast' : '← Clear'}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {isLeader && current && !replaying ? (
                <KlinkButton
                  label={ending ? 'Ending…' : 'End stream'}
                  variant="danger"
                  onPress={() => confirmEnd(current)}
                  disabled={ending}
                  loading={ending}
                />
              ) : null}
            </View>
          </ScrollReveal>
        ) : currentQuery.isLoading ? null : (
          <ScrollReveal delay={0}>
            <EmptyState
              icon="📺"
              title="Nothing live right now"
              subtitle={
                isLeader
                  ? 'Start your stream on YouTube or Facebook, then tap Go Live to tell the church.'
                  : "You'll get a notification the moment your church goes live."
              }
              actionLabel={isLeader ? 'Go Live' : undefined}
              onAction={isLeader ? () => { haptics.medium(); setComposeOpen(true); } : undefined}
            />
          </ScrollReveal>
        )}

        {/* ── Past broadcasts ───────────────────────────────────────────── */}
        {past.length > 0 ? (
          <View style={{ gap: Spacing.sm }}>
            <Text style={styles.sectionLabel}>PAST BROADCASTS</Text>
            {past.map((stream, i) => (
              <ScrollReveal key={stream.id} delay={i * StaggerDelay.list}>
                <TouchableOpacity
                  onPress={() => { haptics.light(); setReplaying(stream); }}
                  onLongPress={
                    isLeader
                      ? () => {
                          haptics.warning();
                          confirmDelete({
                            title: 'Delete this broadcast?',
                            message: 'It disappears from Klink. The video stays on YouTube.',
                            onConfirm: () => removeStream(stream.id),
                          });
                        }
                      : undefined
                  }
                  style={[styles.pastCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`Watch ${stream.title}`}
                >
                  <View style={styles.playIcon}>
                    <Text style={styles.playIconText}>▶</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pastTitle, { color: theme.text }]} numberOfLines={2}>
                      {stream.title}
                    </Text>
                    <Text style={[styles.pastWhen, { color: theme.textMuted }]}>
                      {formatRelativeTime(stream.startedAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              </ScrollReveal>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Leaders: Go Live FAB (only when nothing is currently live) */}
      {isLeader && !current ? (
        <View style={[styles.fabWrap, { paddingBottom: insets.bottom + 16 }]}>
          <KlinkButton
            label="Go Live"
            onPress={() => { haptics.medium(); setComposeOpen(true); }}
            style={styles.fab}
          />
        </View>
      ) : null}

      {/* ── Go Live modal ──────────────────────────────────────────────── */}
      <Modal
        visible={composeOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setComposeOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />

            <Text style={styles.modalTitle}>Go Live</Text>
            <Text style={styles.modalSub}>
              Start the stream on YouTube or Facebook first, then paste its link here — we
              work out the rest. Everyone in your church gets a notification straight away.
            </Text>

            <KlinkInput
              label="What are you streaming?"
              value={title}
              onChangeText={setTitle}
              maxLength={200}
              autoCapitalize="sentences"
            />
            <KlinkInput
              label="YouTube or Facebook link"
              value={streamUrl}
              onChangeText={setStreamUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { haptics.light(); setComposeOpen(false); }}
                style={styles.modalCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <KlinkButton
                  label={starting ? 'Going live…' : 'Go Live'}
                  onPress={() => goLive()}
                  disabled={!title.trim() || !streamUrl.trim() || starting}
                  loading={starting}
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
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.lg, gap: 2 },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  eyebrow: {
    color: Colors.gold, fontSize: 11, fontWeight: FontWeight.semiBold,
    letterSpacing: 2.2, textTransform: 'uppercase',
  },
  headerTitle: {
    color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },

  playerCard: {
    borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.sm,
    borderTopColor: 'rgba(255,255,255,0.18)', gap: Spacing.sm,
  },
  playerFrame: { borderRadius: BorderRadius.md, overflow: 'hidden', backgroundColor: '#000' },
  playerMeta: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingHorizontal: 4 },
  playerTitle: { fontSize: FontSize.body, fontWeight: FontWeight.bold },
  playerWhen: { fontSize: FontSize.caption, marginTop: 2 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(220,38,38,0.18)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.5)',
    borderRadius: BorderRadius.full, paddingHorizontal: 9, paddingVertical: 4,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' },
  liveBadgeText: { color: '#FCA5A5', fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1 },
  backToLive: {
    color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.semiBold,
    paddingHorizontal: 4, paddingVertical: 6,
  },

  sectionLabel: {
    color: Colors.gold, fontSize: 11, fontWeight: FontWeight.semiBold,
    letterSpacing: 2, textTransform: 'uppercase', marginTop: Spacing.sm,
  },
  pastCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md,
    borderTopColor: 'rgba(255,255,255,0.16)',
  },
  playIcon: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(244,164,41,0.14)', borderWidth: 1, borderColor: 'rgba(244,164,41,0.3)',
  },
  playIconText: { color: Colors.gold, fontSize: 15, marginLeft: 2 },
  pastTitle: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  pastWhen: { fontSize: FontSize.caption, marginTop: 2 },

  fabWrap: { position: 'absolute', left: Spacing.pagePadding, right: Spacing.pagePadding, bottom: 0 },
  fab: { width: '100%' },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', padding: Spacing.pagePadding,
  },
  modalCard: {
    borderRadius: BorderRadius.xxl, overflow: 'hidden', padding: Spacing.lg, gap: Spacing.md,
  },
  modalGlass: {
    borderRadius: BorderRadius.xxl, backgroundColor: 'rgba(26,31,62,0.92)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  modalTitle: { color: Colors.white, fontSize: FontSize.h4, fontWeight: FontWeight.bold },
  modalSub: { color: Colors.darkMuted, fontSize: FontSize.small, lineHeight: 20 },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  modalCancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  modalCancelText: { color: Colors.darkMuted, fontSize: FontSize.body, fontWeight: FontWeight.medium },
});
