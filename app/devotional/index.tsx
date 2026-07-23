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
import { OpenBible } from '../../src/components/worship/OpenBible';
import { WatermarkBackground } from '../../src/components/common/WatermarkBackground';
import { ScreenPhotos } from '../../src/utils/worshipImages';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { KlinkCard } from '../../src/components/common/KlinkCard';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { AnnouncementSkeleton } from '../../src/components/common/KlinkSkeleton';
import { devotionalsApi, Devotional } from '../../src/api/devotionals';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import { formatRelativeTime } from '../../src/utils/formatters';
import { StaggerDelay } from '../../src/theme/animations';
import { PAGE_SIZE } from '../../src/utils/constants';
import { AIPolish } from '../../src/components/common/AIPolish';

const CAN_POST = ['PASTOR', 'ELDER', 'MANAGER'];

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

export default function DevotionalScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();

  const canPost = role ? CAN_POST.includes(role) : false;

  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const query = useInfiniteQuery({
    queryKey: ['devotionals'],
    queryFn: ({ pageParam = 0 }) => devotionalsApi.getAll({ page: pageParam, size: PAGE_SIZE }),
    getNextPageParam: (last) => (last.number + 1 < last.totalPages ? last.number + 1 : undefined),
    initialPageParam: 0,
  });

  const devotionals: Devotional[] = query.data?.pages?.flatMap((p) => p.content) ?? [];
  const [featured, ...rest] = devotionals;

  const { mutate: post, isPending: posting } = useMutation({
    mutationFn: () =>
      devotionalsApi.create({
        title: title.trim(),
        content: content.trim(),
        devotionalDate: todayIso(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devotionals'] });
      haptics.success();
      setComposing(false);
      setTitle('');
      setContent('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not post the devotional. Please try again.');
      haptics.error();
    },
  });

  const handleShare = async (d: Devotional) => {
    haptics.light();
    try {
      await Share.share({ message: `${d.title}\n\n${d.content}\n\n— shared from Klink` });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {query.isLoading ? (
        <View style={{ paddingTop: insets.top + Spacing.md }}>
          {Array.from({ length: 5 }, (_, i) => <AnnouncementSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={rest}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View>
              {/* Hero — today's devotional over a warm worship photo */}
              <WatermarkBackground
                imageSource={ScreenPhotos.devotional}
                overlayOpacity={0.62}
                overlayColor="#1A0533"
                style={[styles.hero, { paddingTop: insets.top + 16 }]}
              >
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.backBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
         
                >
                  <Text style={styles.backIcon}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.heroLabel}>DAILY DEVOTIONAL</Text>
                <View style={styles.bibleWrap}>
                  <OpenBible width={220} height={160} />
                </View>

                {featured ? (
                  <ScrollReveal delay={100}>
                    <View style={styles.featuredCard}>
                      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                      <View style={[StyleSheet.absoluteFill, styles.featuredGlass]} />
                      <Text style={styles.featuredTitle}>{featured.title}</Text>
                      <Text style={styles.featuredContent}>{featured.content}</Text>
                      <View style={styles.featuredFooter}>
                        <Text style={styles.featuredDate}>{featured.devotionalDate}</Text>
                        <TouchableOpacity
                          onPress={() => handleShare(featured)}
                          style={styles.shareBtn}
                          accessibilityRole="button"
                          accessibilityLabel="Share this devotional"
                        >
                          <Text style={styles.shareText}>Share ↗</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ScrollReveal>
                ) : (
                  <Text style={styles.emptyHero}>
                    No devotionals yet{canPost ? ' — post the first one below.' : '. Check back soon.'}
                  </Text>
                )}
              </WatermarkBackground>

              {rest.length > 0 && (
                <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>PREVIOUS DEVOTIONALS</Text>
              )}
            </View>
          }
          renderItem={({ item, index }) => (
            <ScrollReveal delay={index * StaggerDelay.list}>
              <KlinkCard onPress={() => handleShare(item)} style={styles.card}>
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[styles.cardContent, { color: theme.textSecondary }]} numberOfLines={3}>
                  {item.content}
                </Text>
                <Text style={[styles.cardDate, { color: theme.textMuted }]}>
                  {item.devotionalDate} · {formatRelativeTime(item.createdAt)}
                </Text>
              </KlinkCard>
            </ScrollReveal>
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
          contentContainerStyle={{ paddingBottom: canPost ? 120 : 60 }}
        />
      )}

      {/* Post FAB — Pastor / Elder / Manager */}
      {canPost && (
        <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            onPress={() => { haptics.medium(); setComposing(true); }}
            style={styles.fab}
            accessibilityRole="button"
            accessibilityLabel="Post a devotional"
          >
            <LinearGradient colors={Gradients.glory} style={styles.fabGradient}>
              <Text style={styles.fabText}>+ Post</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Compose modal */}
      <Modal
        visible={composing}
        transparent
        animationType="fade"
        onRequestClose={() => setComposing(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />

            <Text style={styles.modalTitle}>Today's devotional</Text>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
            >
              <KlinkInput
                label="Title"
                value={title}
                onChangeText={setTitle}
                autoCapitalize="sentences"
                maxLength={100}
              />
              <Text style={styles.charCount}>{title.length}/100</Text>
              <KlinkInput
                label="Devotional message"
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={8}
                maxLength={2000}
                autoCapitalize="sentences"
                blurOnSubmit={false}
              />
              <Text style={styles.charCount}>{content.length}/2000</Text>
              <AIPolish text={content} onResult={setContent} contentType="a daily devotional message (warm and encouraging)" />
              <View style={{ height: 12 }} />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { haptics.light(); setComposing(false); }}
                style={styles.modalCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.modalSubmit}>
                <KlinkButton
                  label="Post Devotional"
                  onPress={() => { if (title.trim() && content.trim()) post(); }}
                  disabled={!title.trim() || !content.trim() || posting}
                  loading={posting}
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
  hero: {
    paddingHorizontal: Spacing.pagePadding,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xxl,
    borderBottomRightRadius: BorderRadius.xxl,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  heroLabel: {
    color: Colors.gold,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.widest,
    textAlign: 'center',
  },
  bibleWrap: { alignItems: 'center', marginVertical: Spacing.sm },
  featuredCard: {
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  featuredGlass: {
    borderRadius: BorderRadius.xxl,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  featuredTitle: {
    color: Colors.white,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: FontSize.h3,
    lineHeight: FontSize.h3 * 1.3,
  },
  featuredContent: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.body,
    lineHeight: FontSize.body * 1.7,
    fontStyle: 'italic',
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  featuredDate: { color: Colors.gold, fontSize: FontSize.caption, fontWeight: FontWeight.semiBold },
  shareBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  shareText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  emptyHero: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.body,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  sectionLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.widest,
    paddingHorizontal: Spacing.pagePadding,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  card: {
    marginHorizontal: Spacing.pagePadding,
    marginBottom: Spacing.sm,
    gap: 6,
  },
  cardTitle: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  cardContent: { fontSize: FontSize.small, lineHeight: FontSize.small * 1.6 },
  cardDate: { fontSize: FontSize.caption },
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
  modalScroll: { maxHeight: 420 },
  charCount: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: FontSize.caption,
    textAlign: 'right',
    marginTop: -8,
    marginBottom: Spacing.sm,
  },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  modalCancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  modalCancelText: { color: Colors.darkMuted, fontSize: FontSize.body, fontWeight: FontWeight.medium },
  modalSubmit: { flex: 1 },
});
