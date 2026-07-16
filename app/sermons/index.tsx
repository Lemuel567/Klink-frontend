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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SermonCard } from '../../src/components/screens/SermonCard';
import { SermonCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { OpenBible } from '../../src/components/worship';
import { WatermarkBackground } from '../../src/components/common/WatermarkBackground';
import { ScreenPhotos } from '../../src/utils/worshipImages';
import { sermonsApi, Sermon } from '../../src/api/sermons';
import { useBookmarkStore } from '../../src/store/bookmarkStore';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import { PAGE_SIZE } from '../../src/utils/constants';

type Tab = 'all' | 'saved';

const CAN_POST = ['PASTOR', 'ELDER', 'MANAGER'];

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

export default function SermonsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('all');
  const bookmarkedIds = useBookmarkStore((s) => s.sermonIds);

  const canPost = role ? CAN_POST.includes(role) : false;

  // Upload form state
  const [composing, setComposing] = useState(false);
  const [preacher, setPreacher] = useState('');
  const [title, setTitle] = useState('');
  const [sermonDate, setSermonDate] = useState(todayIso());
  const [memoryVerse, setMemoryVerse] = useState('');
  const [scripture, setScripture] = useState('');
  const [notes, setNotes] = useState('');
  const [audio, setAudio] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [formError, setFormError] = useState('');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['sermons'],
      queryFn: ({ pageParam = 0 }) => sermonsApi.list({ page: pageParam, size: PAGE_SIZE }),
      getNextPageParam: (last) =>
        last.number + 1 < last.totalPages ? last.number + 1 : undefined,
      initialPageParam: 0,
    });

  const allSermons: Sermon[] = data?.pages.flatMap((p) => p.content) ?? [];
  const sermons =
    tab === 'saved' ? allSermons.filter((s) => bookmarkedIds.includes(s.id)) : allSermons;

  const resetForm = () => {
    setPreacher('');
    setTitle('');
    setSermonDate(todayIso());
    setMemoryVerse('');
    setScripture('');
    setNotes('');
    setAudio(null);
    setFormError('');
  };

  const pickAudio = async () => {
    haptics.light();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        // Backend accepts mp3 / m4a / aac (magic-byte validated)
        type: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setAudio({
        uri: asset.uri,
        name: asset.name ?? 'sermon-audio.mp3',
        type: asset.mimeType ?? 'audio/mpeg',
      });
    } catch {
      Alert.alert('Error', 'Could not open the file picker.');
    }
  };

  const { mutate: upload, isPending: uploading } = useMutation({
    mutationFn: () =>
      sermonsApi.create({
        preacher: preacher.trim(),
        title: title.trim(),
        sermonDate: sermonDate.trim(),
        memoryVerse: memoryVerse.trim() || undefined,
        scripture: scripture.trim() || undefined,
        notes: notes.trim() || undefined,
        audio: audio ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sermons'] });
      haptics.success();
      setComposing(false);
      resetForm();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not upload the sermon. Please try again.');
      haptics.error();
    },
  });

  const handleSubmit = () => {
    setFormError('');
    if (!preacher.trim()) {
      setFormError('Preacher name is required.');
      return;
    }
    if (!title.trim()) {
      setFormError('Sermon title is required.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sermonDate.trim())) {
      setFormError('Date must be in YYYY-MM-DD format.');
      return;
    }
    upload();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Hero header — bright sanctuary photo (congregation-2) */}
      <WatermarkBackground
        imageSource={ScreenPhotos.sermons}
        overlayOpacity={0.6}
        overlayColor="#1A0533"
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        {/* Open Bible with light rays behind the title */}
        <View style={styles.heroArt} pointerEvents="none">
          <OpenBible width={200} height={150} />
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sermons</Text>
        <Text style={styles.headerSub}>Messages from the Word</Text>

        {/* All / Saved tabs */}
        <View style={styles.tabBar}>
          {(['all', 'saved'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => { haptics.light(); setTab(t); }}
              style={[styles.tab, tab === t && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'all' ? 'All' : `Saved${bookmarkedIds.length > 0 ? ` (${bookmarkedIds.length})` : ''}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </WatermarkBackground>

      {isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 5 }, (_, i) => <SermonCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={sermons}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <SermonCard
              sermon={item}
              index={index}
              featured={tab === 'all' && index === 0}
              onPress={() => router.push(`/sermons/${item.id}`)}
            />
          )}
          onEndReached={() =>
            tab === 'all' && hasNextPage && !isFetchingNextPage && fetchNextPage()
          }
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            tab === 'saved' ? (
              <EmptyState
                icon="🔖"
                title="No saved sermons yet"
                subtitle="Open a sermon and tap the bookmark to save it for later."
                actionLabel="Browse sermons"
                onAction={() => setTab('all')}
              />
            ) : (
              <EmptyState
                icon="📖"
                title="No sermons yet"
                subtitle={canPost ? 'Upload the first message below.' : 'Messages will appear here once posted.'}
                actionLabel={canPost ? '+ Add sermon' : undefined}
                onAction={canPost ? () => setComposing(true) : undefined}
              />
            )
          }
          ListFooterComponent={
            tab === 'all' && isFetchingNextPage ? (
              <SermonCardSkeleton />
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />
          }
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: canPost ? 120 : 100 }}
        />
      )}

      {/* Upload FAB — Pastor / Elder / Manager */}
      {canPost && (
        <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            onPress={() => { haptics.medium(); setComposing(true); }}
            style={styles.fab}
            accessibilityRole="button"
            accessibilityLabel="Add a sermon"
          >
            <LinearGradient colors={Gradients.glory} style={styles.fabGradient}>
              <Text style={styles.fabText}>+ Add sermon</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Upload modal */}
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

            <Text style={styles.modalTitle}>New sermon</Text>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
            >
              <KlinkInput
                label="Sermon title"
                value={title}
                onChangeText={setTitle}
                autoCapitalize="sentences"
                maxLength={200}
              />
              <KlinkInput
                label="Preacher"
                value={preacher}
                onChangeText={setPreacher}
                autoCapitalize="words"
                maxLength={200}
              />
              <KlinkInput
                label="Memory verse (optional)"
                value={memoryVerse}
                onChangeText={setMemoryVerse}
                maxLength={300}
              />
              <KlinkInput
                label="Scripture reading (optional)"
                value={scripture}
                onChangeText={setScripture}
                maxLength={300}
              />
              <KlinkInput
                label="Notes (optional)"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                maxLength={10000}
                autoCapitalize="sentences"
              />

              {/* Date uses a label-above plain input — floating labels overlap typed dates */}
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>SERMON DATE</Text>
                <TextInput
                  value={sermonDate}
                  onChangeText={setSermonDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={styles.dateInput}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  selectionColor={Colors.gold}
                />
              </View>

              {/* Audio picker — optional mp3/m4a */}
              <TouchableOpacity
                onPress={pickAudio}
                style={styles.audioPicker}
                accessibilityRole="button"
                accessibilityLabel="Attach sermon audio"
              >
                <Text style={styles.audioIcon}>{audio ? '🎵' : '🎙'}</Text>
                <View style={styles.audioInfo}>
                  <Text style={styles.audioTitle} numberOfLines={1}>
                    {audio ? audio.name : 'Attach audio (optional)'}
                  </Text>
                  <Text style={styles.audioSub}>
                    {audio ? 'Tap to replace' : 'MP3 or M4A recording of the message'}
                  </Text>
                </View>
                {audio && (
                  <TouchableOpacity
                    onPress={() => { haptics.light(); setAudio(null); }}
                    style={styles.audioRemove}
                    accessibilityRole="button"
                    accessibilityLabel="Remove audio"
                  >
                    <Text style={styles.audioRemoveText}>✕</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
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
                  label={audio ? 'Upload Sermon' : 'Post Sermon'}
                  onPress={handleSubmit}
                  disabled={!title.trim() || !preacher.trim() || uploading}
                  loading={uploading}
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
  header: {
    paddingHorizontal: Spacing.pagePadding,
    paddingBottom: Spacing.md,
    gap: 4,
    overflow: 'hidden',
  },
  heroArt: {
    position: 'absolute',
    right: -12,
    top: 8,
    opacity: 0.35,
  },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  tabBar: {
    flexDirection: 'row',
    marginTop: Spacing.md,
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
    minWidth: 80,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.white },
  tabText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  tabTextActive: { color: Colors.purple },
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
  modalScroll: { maxHeight: 460 },
  dateField: { marginBottom: Spacing.md },
  dateLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wider,
    marginBottom: 6,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: FontSize.body,
  },
  audioPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.35)',
    borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
    padding: Spacing.md,
    minHeight: 64,
  },
  audioIcon: { fontSize: 24 },
  audioInfo: { flex: 1, gap: 2 },
  audioTitle: { color: Colors.white, fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  audioSub: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.caption },
  audioRemove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  audioRemoveText: { color: Colors.red, fontSize: 16, fontWeight: FontWeight.bold },
  formError: { color: Colors.red, fontSize: FontSize.small, marginTop: Spacing.sm },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  modalCancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  modalCancelText: { color: Colors.darkMuted, fontSize: FontSize.body, fontWeight: FontWeight.medium },
  modalSubmit: { flex: 1 },
});
