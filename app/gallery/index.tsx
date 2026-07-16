import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
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
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { KlinkSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { galleryApi, GalleryPhoto } from '../../src/api/gallery';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import { PAGE_SIZE } from '../../src/utils/constants';

const { width } = Dimensions.get('window');
const GAP = Spacing.sm;
// Each tile carries GAP/2 side margins, so a row consumes 2*TILE + 2*GAP
const TILE = (width - Spacing.pagePadding * 2 - GAP * 2) / 2;

export default function GalleryScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();

  // Backend: upload is Manager-only
  const canUpload = role === 'MANAGER';

  const [pending, setPending] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [caption, setCaption] = useState('');
  const [viewing, setViewing] = useState<GalleryPhoto | null>(null);

  const query = useInfiniteQuery({
    queryKey: ['gallery'],
    queryFn: ({ pageParam = 0 }) => galleryApi.getAll({ page: pageParam, size: PAGE_SIZE }),
    getNextPageParam: (last) => (last.number + 1 < last.totalPages ? last.number + 1 : undefined),
    initialPageParam: 0,
  });

  const photos: GalleryPhoto[] = query.data?.pages.flatMap((p) => p.content) ?? [];

  const pickPhoto = async () => {
    haptics.medium();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const uri = result.assets[0].uri;
    const name = uri.split('/').pop() ?? 'photo.jpg';
    const ext = name.split('.').pop()?.toLowerCase() ?? 'jpg';
    setPending({ uri, name, type: ext === 'png' ? 'image/png' : 'image/jpeg' });
    setCaption('');
  };

  const { mutate: upload, isPending: uploading } = useMutation({
    mutationFn: () => galleryApi.upload(pending!, caption.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      haptics.success();
      setPending(null);
      setCaption('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not upload the photo.');
      haptics.error();
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient colors={Gradients.stage} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gallery</Text>
        <Text style={styles.headerSub}>Moments from our church family</Text>
      </LinearGradient>

      {query.isLoading ? (
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 6 }, (_, i) => (
            <KlinkSkeleton key={i} width={TILE} height={TILE} borderRadius={BorderRadius.lg} />
          ))}
        </View>
      ) : (
        <FlashList
          data={photos}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => { haptics.light(); setViewing(item); }}
              style={styles.tile}
              accessibilityRole="imagebutton"
              accessibilityLabel={item.caption ?? 'Church photo'}
            >
              <ExpoImage
                source={{ uri: item.photoUrl }}
                style={styles.tileImg}
                contentFit="cover"
                transition={250}
                cachePolicy="memory-disk"
              />
              {item.caption ? (
                <LinearGradient colors={Gradients.cardOverlay} style={styles.tileCaptionWrap}>
                  <Text style={styles.tileCaption} numberOfLines={1}>{item.caption}</Text>
                </LinearGradient>
              ) : null}
            </TouchableOpacity>
          )}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={Colors.gold} />
          }
          contentContainerStyle={{
            paddingTop: Spacing.md,
            paddingHorizontal: Spacing.pagePadding,
            paddingBottom: canUpload ? 120 : 100,
          }}
          ListEmptyComponent={
            <EmptyState
              icon="📷"
              title="No photos yet"
              subtitle={canUpload ? 'Share the first moment with your church.' : 'Photos from services and events will appear here.'}
              actionLabel={canUpload ? '+ Upload photo' : undefined}
              onAction={canUpload ? pickPhoto : undefined}
            />
          }
        />
      )}

      {/* Upload FAB — Manager only */}
      {canUpload && (
        <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            onPress={pickPhoto}
            style={styles.fab}
            accessibilityRole="button"
            accessibilityLabel="Upload a photo"
          >
            <LinearGradient colors={Gradients.glory} style={styles.fabGradient}>
              <Text style={styles.fabText}>+ Upload</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Caption + confirm modal */}
      <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => setPending(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />
            <Text style={styles.modalTitle}>Add to gallery</Text>
            {pending && (
              <ExpoImage source={{ uri: pending.uri }} style={styles.preview} contentFit="cover" />
            )}
            <KlinkInput
              label="Caption (optional)"
              value={caption}
              onChangeText={setCaption}
              maxLength={200}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { haptics.light(); setPending(null); }}
                style={styles.modalCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <KlinkButton label="Upload Photo" onPress={() => upload()} loading={uploading} disabled={uploading} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Full-photo viewer */}
      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <TouchableOpacity
          style={styles.viewerBackdrop}
          activeOpacity={1}
          onPress={() => setViewing(null)}
          accessibilityRole="button"
          accessibilityLabel="Close photo"
        >
          {viewing && (
            <View style={styles.viewerContent}>
              <ExpoImage
                source={{ uri: viewing.photoUrl }}
                style={styles.viewerImg}
                contentFit="contain"
                transition={200}
              />
              {viewing.caption ? <Text style={styles.viewerCaption}>{viewing.caption}</Text> : null}
            </View>
          )}
        </TouchableOpacity>
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
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    padding: Spacing.pagePadding,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: GAP,
    marginRight: GAP / 2,
    marginLeft: GAP / 2,
  },
  tileImg: { width: '100%', height: '100%' },
  tileCaptionWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  tileCaption: { color: Colors.white, fontSize: FontSize.caption, fontWeight: FontWeight.medium },
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
  preview: { width: '100%', height: 200, borderRadius: BorderRadius.lg },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  modalCancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  modalCancelText: { color: Colors.darkMuted, fontSize: FontSize.body, fontWeight: FontWeight.medium },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
  },
  viewerContent: { gap: Spacing.md },
  viewerImg: { width: '100%', height: '80%' },
  viewerCaption: {
    color: Colors.white,
    fontSize: FontSize.body,
    textAlign: 'center',
    paddingHorizontal: Spacing.pagePadding,
  },
});
