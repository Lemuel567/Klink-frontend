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
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { SermonCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { confirmDelete } from '../../src/utils/confirmDelete';
import { hallOfFameApi, HallOfFameEntry } from '../../src/api/hallOfFame';
import { membersApi, Member } from '../../src/api/members';
import { useDebounce } from '../../src/hooks/useDebounce';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import { formatRelativeTime } from '../../src/utils/formatters';
import { StaggerDelay } from '../../src/theme/animations';
import { PAGE_SIZE } from '../../src/utils/constants';

// Backend: create / update / delete = Pastor, Elder, Manager
const CAN_MANAGE = ['PASTOR', 'ELDER', 'MANAGER'];

export default function HallOfFameScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();

  const canManage = role ? CAN_MANAGE.includes(role) : false;

  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [honoree, setHonoree] = useState<Member | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);
  const debouncedSearch = useDebounce(memberSearch, 350);

  const query = useInfiniteQuery({
    queryKey: ['hall-of-fame'],
    queryFn: ({ pageParam = 0 }) => hallOfFameApi.getAll({ page: pageParam, size: PAGE_SIZE }),
    getNextPageParam: (last) => (last.number + 1 < last.totalPages ? last.number + 1 : undefined),
    initialPageParam: 0,
  });

  const entries: HallOfFameEntry[] = query.data?.pages.flatMap((p) => p.content) ?? [];

  const { data: memberResults } = useQuery({
    queryKey: ['members', 'hof-search', debouncedSearch],
    queryFn: () => membersApi.list({ search: debouncedSearch, size: 8 }),
    enabled: composing && !honoree && debouncedSearch.length >= 2,
  });

  const pickPhoto = async () => {
    haptics.light();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const uri = result.assets[0].uri;
    const name = uri.split('/').pop() ?? 'photo.jpg';
    const ext = name.split('.').pop()?.toLowerCase() ?? 'jpg';
    setPhoto({ uri, name, type: ext === 'png' ? 'image/png' : 'image/jpeg' });
  };

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: () =>
      hallOfFameApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        memberId: honoree?.id,
        photo: photo ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hall-of-fame'] });
      haptics.success();
      setComposing(false);
      setTitle('');
      setDescription('');
      setHonoree(null);
      setMemberSearch('');
      setPhoto(null);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not create the entry.');
      haptics.error();
    },
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id: string) => hallOfFameApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hall-of-fame'] });
      haptics.success();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not delete the entry.');
      haptics.error();
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient colors={Gradients.golden} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hall of Fame</Text>
        <Text style={styles.headerSub}>Honouring faithful service</Text>
      </LinearGradient>

      {query.isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 3 }, (_, i) => <SermonCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ScrollReveal delay={index * StaggerDelay.list} style={styles.cardWrap}>
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                {item.photoUrl && (
                  <ExpoImage
                    source={{ uri: item.photoUrl }}
                    style={styles.cardPhoto}
                    contentFit="cover"
                    transition={250}
                    cachePolicy="memory-disk"
                  />
                )}
                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.laurel}>🏆</Text>
                    <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {canManage && (
                      <TouchableOpacity
                        onPress={() =>
                          confirmDelete({
                            title: 'Remove this entry?',
                            message: 'It will no longer appear in the Hall of Fame.',
                            onConfirm: () => remove(item.id),
                          })
                        }
                        style={styles.cardDelete}
                        accessibilityRole="button"
                        accessibilityLabel="Delete entry"
                      >
                        <Text style={styles.cardDeleteText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {item.memberName ? (
                    <Text style={[styles.cardMember, { color: Colors.gold }]}>{item.memberName}</Text>
                  ) : null}
                  {item.description ? (
                    <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{item.description}</Text>
                  ) : null}
                  <Text style={[styles.cardDate, { color: theme.textMuted }]}>
                    {formatRelativeTime(item.createdAt)}
                  </Text>
                </View>
              </View>
            </ScrollReveal>
          )}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={Colors.gold} />
          }
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: canManage ? 120 : 100 }}
          ListEmptyComponent={
            <EmptyState
              icon="🏆"
              title="No honourees yet"
              subtitle={
                canManage
                  ? 'Celebrate members whose service has blessed the church.'
                  : 'Honoured members will appear here.'
              }
              actionLabel={canManage ? '+ Honour someone' : undefined}
              onAction={canManage ? () => setComposing(true) : undefined}
            />
          }
        />
      )}

      {/* Create FAB — Pastor / Elder / Manager */}
      {canManage && (
        <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            onPress={() => { haptics.medium(); setComposing(true); }}
            style={styles.fab}
            accessibilityRole="button"
            accessibilityLabel="Add a Hall of Fame entry"
          >
            <LinearGradient colors={Gradients.glory} style={styles.fabGradient}>
              <Text style={styles.fabText}>+ Honour</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Create modal */}
      <Modal visible={composing} transparent animationType="fade" onRequestClose={() => setComposing(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />
            <Text style={styles.modalTitle}>Honour someone</Text>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
            >
              <KlinkInput
                label="Title (e.g. 30 Years of Choir Service)"
                value={title}
                onChangeText={setTitle}
                autoCapitalize="sentences"
                maxLength={200}
              />
              <KlinkInput
                label="Story (optional)"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={2000}
                autoCapitalize="sentences"
              />

              {/* Optional honouree — church directory search */}
              <Text style={styles.fieldLabel}>HONOUREE (OPTIONAL)</Text>
              {honoree ? (
                <View style={styles.pickedRow}>
                  <Text style={styles.pickedName} numberOfLines={1}>{honoree.fullName}</Text>
                  <TouchableOpacity
                    onPress={() => { haptics.light(); setHonoree(null); setMemberSearch(''); }}
                    style={styles.pickedClear}
                    accessibilityRole="button"
                    accessibilityLabel="Change honouree"
                  >
                    <Text style={styles.pickedClearText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ marginBottom: Spacing.md }}>
                  <TextInput
                    value={memberSearch}
                    onChangeText={setMemberSearch}
                    placeholder="Search member by name…"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    style={styles.searchInput}
                    selectionColor={Colors.gold}
                    autoCapitalize="none"
                  />
                  {(memberResults?.content?.length ?? 0) > 0 && (
                    <View style={styles.results}>
                      {memberResults!.content.map((m) => (
                        <TouchableOpacity
                          key={m.id}
                          onPress={() => { haptics.light(); setHonoree(m); }}
                          style={styles.resultRow}
                          accessibilityRole="button"
                          accessibilityLabel={m.fullName}
                        >
                          <Text style={styles.resultName} numberOfLines={1}>{m.fullName}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Optional photo */}
              <TouchableOpacity
                onPress={pickPhoto}
                style={styles.photoPicker}
                accessibilityRole="button"
                accessibilityLabel="Add a photo"
              >
                {photo ? (
                  <ExpoImage source={{ uri: photo.uri }} style={styles.photoPreview} contentFit="cover" />
                ) : (
                  <Text style={styles.photoPickerText}>📸 Add a photo (optional)</Text>
                )}
              </TouchableOpacity>
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
              <View style={{ flex: 1 }}>
                <KlinkButton
                  label="Add to Hall of Fame"
                  onPress={() => { if (title.trim()) create(); }}
                  disabled={!title.trim() || creating}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.lg, gap: 4 },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  headerTitle: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.tight },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.small },
  cardWrap: { marginHorizontal: Spacing.pagePadding, marginBottom: Spacing.md },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardPhoto: { width: '100%', height: 180 },
  cardBody: { padding: Spacing.md, gap: 6 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  laurel: { fontSize: 18, marginTop: 1 },
  cardTitle: { flex: 1, fontSize: FontSize.body, fontWeight: FontWeight.semiBold, lineHeight: FontSize.body * 1.4 },
  cardDelete: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  cardDeleteText: { color: Colors.red, fontSize: 14, fontWeight: FontWeight.bold },
  cardMember: { fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  cardDesc: { fontSize: FontSize.small, lineHeight: FontSize.small * 1.5 },
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
  modalCard: { borderRadius: BorderRadius.xxl, overflow: 'hidden', padding: Spacing.lg, gap: Spacing.md },
  modalGlass: {
    borderRadius: BorderRadius.xxl,
    backgroundColor: 'rgba(26,31,62,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  modalTitle: { color: Colors.white, fontSize: FontSize.h4, fontWeight: FontWeight.bold },
  modalScroll: { maxHeight: 440 },
  fieldLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wider,
    marginBottom: 6,
  },
  pickedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.4)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
    marginBottom: Spacing.md,
  },
  pickedName: { color: Colors.white, fontSize: FontSize.body, fontWeight: FontWeight.semiBold, flex: 1 },
  pickedClear: { minHeight: 44, justifyContent: 'center', paddingLeft: Spacing.sm },
  pickedClearText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  searchInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: FontSize.body,
  },
  results: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  resultRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    minHeight: 44,
    justifyContent: 'center',
  },
  resultName: { color: Colors.white, fontSize: FontSize.small, fontWeight: FontWeight.medium },
  photoPicker: {
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.35)',
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoPickerText: { color: 'rgba(255,255,255,0.65)', fontSize: FontSize.small },
  photoPreview: { width: '100%', height: 140 },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  modalCancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  modalCancelText: { color: Colors.darkMuted, fontSize: FontSize.body, fontWeight: FontWeight.medium },
});
