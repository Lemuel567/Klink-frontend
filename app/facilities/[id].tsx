import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { KlinkCard } from '../../src/components/common/KlinkCard';
import { MemberCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { confirmDelete } from '../../src/utils/confirmDelete';
import { facilitiesApi, FacilityImage } from '../../src/api/facilities';
import { mediaApi } from '../../src/api/media';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontFamily, FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole, useUser } from '../../src/store/authStore';
import { StaggerDelay } from '../../src/theme/animations';

// Role gates mirror FacilityService exactly:
// add photo = Pastor, Elder, Manager · delete photo = Pastor, Manager, or the
// original uploader · set cover = Pastor, Manager.
const CAN_ADD_PHOTO = ['PASTOR', 'ELDER', 'MANAGER'];
const CAN_MANAGE_PHOTO = ['PASTOR', 'MANAGER'];

const CONDITION_COLOR: Record<string, string> = {
  EXCELLENT: Colors.green,
  GOOD: Colors.blue,
  FAIR: Colors.gold,
  POOR: Colors.roseGold,
  NEEDS_REPAIR: Colors.red,
};

const TYPE_ICON: Record<string, string> = {
  SANCTUARY: '⛪', HALL: '🏛', OFFICE: '🏢', PARKING: '🅿️', SCHOOL: '🏫',
  CLINIC: '🏥', LAND: '🌍', EQUIPMENT: '🎛', VEHICLE: '🚐', OTHER: '📦',
};

const money = (v: number, currency: string) =>
  `${currency} ${v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

export default function FacilityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const user = useUser();
  const queryClient = useQueryClient();

  const canAddPhoto = role ? CAN_ADD_PHOTO.includes(role) : false;
  const canManagePhoto = role ? CAN_MANAGE_PHOTO.includes(role) : false;

  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<FacilityImage | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['facility', id],
    queryFn: () => facilitiesApi.get(id!),
    enabled: !!id,
  });

  const facility = data?.facility;
  const images = data?.images ?? [];
  const cover = images.find((i) => i.isPrimary) ?? images[0];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['facility', id] });
    queryClient.invalidateQueries({ queryKey: ['facilities'] });
  };

  const { mutate: removeImage } = useMutation({
    mutationFn: (imageId: string) => facilitiesApi.deleteImage(id!, imageId),
    onSuccess: () => { refresh(); haptics.success(); },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not delete the photo.');
      haptics.error();
    },
  });

  const { mutate: makeCover } = useMutation({
    mutationFn: (imageId: string) => facilitiesApi.setPrimaryImage(id!, imageId),
    onSuccess: () => { refresh(); haptics.success(); },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not set the cover photo.');
      haptics.error();
    },
  });

  // Multi-select picker → upload each → attach to the facility. The first
  // photo a facility ever gets becomes its cover automatically.
  const addPhotos = async () => {
    haptics.light();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    setUploading(true);
    try {
      let isFirst = images.length === 0;
      for (const asset of result.assets) {
        const uploaded = await mediaApi.upload(
          {
            uri: asset.uri,
            name: asset.fileName ?? `facility-${Date.now()}.jpg`,
            type: asset.mimeType ?? 'image/jpeg',
          },
          'facilities',
        );
        await facilitiesApi.addImage(id!, { imageUrl: uploaded.imageUrl, isPrimary: isFirst });
        isFirst = false;
      }
      refresh();
      haptics.success();
    } catch (err: any) {
      Alert.alert('Upload failed', err?.friendlyMessage ?? 'Could not upload the photo(s). Please try again.');
      haptics.error();
    } finally {
      setUploading(false);
    }
  };

  const managePhoto = (img: FacilityImage) => {
    const isUploader = user?.id === img.uploadedBy;
    if (!canManagePhoto && !isUploader) return;
    haptics.light();
    const buttons: any[] = [];
    if (canManagePhoto && !img.isPrimary) {
      buttons.push({ text: 'Set as cover', onPress: () => makeCover(img.id) });
    }
    if (canManagePhoto || isUploader) {
      buttons.push({
        text: 'Delete photo',
        style: 'destructive',
        onPress: () =>
          confirmDelete({
            title: 'Delete this photo?',
            message: 'It will be removed from this facility.',
            onConfirm: () => removeImage(img.id),
          }),
      });
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Manage photo', img.caption ?? undefined, buttons);
  };

  if (isLoading || !facility) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + 16 }]}>
        {Array.from({ length: 4 }, (_, i) => <MemberCardSkeleton key={i} />)}
      </View>
    );
  }

  const condColor = CONDITION_COLOR[facility.condition] ?? Colors.darkMuted;
  const currency = facility.currency ?? 'GHS';

  const detailRows: { label: string; value?: string }[] = [
    { label: 'Address', value: facility.address },
    { label: 'Capacity', value: facility.capacity != null ? String(facility.capacity) : undefined },
    { label: 'Year acquired', value: facility.yearAcquired != null ? String(facility.yearAcquired) : undefined },
    { label: 'Estimated value', value: facility.estimatedValue != null ? money(facility.estimatedValue, currency) : undefined },
    { label: 'Status', value: facility.isActive ? 'Active' : 'Inactive' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Hero — cover photo (or a quiet gradient when none exists yet) */}
        <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          {cover ? (
            <Image
              source={{ uri: cover.imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={300}
            />
          ) : (
            <LinearGradient colors={Gradients.darkWorship} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient
            colors={['rgba(10,5,32,0.25)', 'rgba(10,5,32,0.5)', 'rgba(10,5,32,0.95)']}
            style={StyleSheet.absoluteFill}
          />
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
         
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          {!cover && <Text style={styles.heroEmoji}>{TYPE_ICON[facility.facilityType] ?? '🏛'}</Text>}
          <View style={styles.heroText}>
            <Text style={styles.heroEyebrow}>{facility.facilityType.replace('_', ' ')}</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>{facility.name}</Text>
            <View style={[styles.condBadge, { backgroundColor: `${condColor}30` }]}>
              <Text style={[styles.condText, { color: condColor }]}>
                {facility.condition.replace('_', ' ')}
              </Text>
            </View>
          </View>
        </View>

        {/* Photos — everyone views; leaders add; long-press to manage */}
        <ScrollReveal delay={StaggerDelay.list} style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>PHOTOS{images.length > 0 ? ` (${images.length})` : ''}</Text>
          </View>
          {images.length === 0 && !canAddPhoto ? (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No photos yet.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
              {images.map((img) => (
                <TouchableOpacity
                  key={img.id}
                  onPress={() => { haptics.light(); setViewing(img); }}
                  onLongPress={() => managePhoto(img)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={img.caption ?? 'Facility photo'}
                >
                  <Image
                    source={{ uri: img.imageUrl }}
                    style={styles.photo}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={200}
                  />
                  {img.isPrimary && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>COVER</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              {canAddPhoto && (
                <TouchableOpacity
                  onPress={addPhotos}
                  disabled={uploading}
                  style={styles.addPhoto}
                  accessibilityRole="button"
                  accessibilityLabel="Add photos"
                >
                  {uploading ? (
                    <ActivityIndicator color={Colors.gold} />
                  ) : (
                    <>
                      <Text style={styles.addPhotoPlus}>＋</Text>
                      <Text style={styles.addPhotoText}>Add photos</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
          {canManagePhoto && images.length > 0 && (
            <Text style={[styles.hintText, { color: theme.textMuted }]}>
              Long-press a photo to set the cover or delete it.
            </Text>
          )}
        </ScrollReveal>

        {/* About */}
        {facility.description ? (
          <ScrollReveal delay={StaggerDelay.list * 2} style={styles.section}>
            <KlinkCard>
              <Text style={styles.sectionLabel}>ABOUT</Text>
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                {facility.description}
              </Text>
            </KlinkCard>
          </ScrollReveal>
        ) : null}

        {/* Details */}
        <ScrollReveal delay={StaggerDelay.list * 3} style={styles.section}>
          <KlinkCard>
            <Text style={styles.sectionLabel}>DETAILS</Text>
            {detailRows.filter((r) => r.value).map((r) => (
              <View key={r.label} style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>{r.label}</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{r.value}</Text>
              </View>
            ))}
            {facility.notes ? (
              <View style={styles.notesBlock}>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Notes</Text>
                <Text style={[styles.description, { color: theme.textSecondary }]}>{facility.notes}</Text>
              </View>
            ) : null}
          </KlinkCard>
        </ScrollReveal>

        {images.length === 0 && canAddPhoto && (
          <ScrollReveal delay={StaggerDelay.list * 4} style={styles.section}>
            <EmptyState
              icon="📷"
              title="No photos yet"
              subtitle="Add pictures so members can see this facility."
              actionLabel="+ Add photos"
              onAction={addPhotos}
            />
          </ScrollReveal>
        )}
      </ScrollView>

      {/* Full-screen photo viewer */}
      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={styles.viewerBackdrop}>
          <TouchableOpacity
            onPress={() => setViewing(null)}
            style={[styles.viewerClose, { top: insets.top + 10 }]}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
          >
            <Text style={styles.viewerCloseText}>✕</Text>
          </TouchableOpacity>
          {viewing && (
            <Image
              source={{ uri: viewing.imageUrl }}
              style={styles.viewerImage}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={200}
            />
          )}
          {viewing?.caption ? <Text style={styles.viewerCaption}>{viewing.caption}</Text> : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    minHeight: 240,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.pagePadding,
    paddingBottom: Spacing.lg,
    overflow: 'hidden',
    borderBottomLeftRadius: BorderRadius.xxl,
    borderBottomRightRadius: BorderRadius.xxl,
  },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  heroEmoji: { fontSize: 56, textAlign: 'center', opacity: 0.55 },
  heroText: { gap: 6 },
  heroEyebrow: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: FontWeight.semiBold,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: Colors.white,
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.h2,
    letterSpacing: LetterSpacing.tight,
  },
  condBadge: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  condText: { fontSize: FontSize.caption, fontWeight: FontWeight.semiBold, textTransform: 'capitalize' },
  section: { paddingHorizontal: Spacing.pagePadding, marginTop: Spacing.lg },
  sectionHead: { marginBottom: Spacing.sm },
  sectionLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wider,
    marginBottom: Spacing.sm,
  },
  photoStrip: { gap: Spacing.sm },
  photo: {
    width: 150,
    height: 108,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.25)',
  },
  coverBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(10,5,32,0.75)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  coverBadgeText: { color: Colors.gold, fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 1 },
  addPhoto: {
    width: 150,
    height: 108,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(244,164,41,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(244,164,41,0.06)',
  },
  addPhotoPlus: { color: Colors.gold, fontSize: 24, lineHeight: 26 },
  addPhotoText: { color: Colors.gold, fontSize: FontSize.caption, fontWeight: FontWeight.semiBold },
  hintText: { fontSize: FontSize.micro, marginTop: Spacing.sm },
  emptyText: { fontSize: FontSize.small },
  description: { fontSize: FontSize.small, lineHeight: FontSize.small * 1.6 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 36,
    gap: Spacing.md,
  },
  detailLabel: { fontSize: FontSize.small },
  detailValue: { fontSize: FontSize.small, fontWeight: FontWeight.semiBold, flexShrink: 1, textAlign: 'right' },
  notesBlock: { marginTop: Spacing.sm, gap: 4 },
  viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  viewerClose: {
    position: 'absolute',
    right: Spacing.pagePadding,
    zIndex: 2,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerCloseText: { color: Colors.white, fontSize: 22 },
  viewerImage: { width: '100%', height: '80%' },
  viewerCaption: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSize.small,
    textAlign: 'center',
    paddingHorizontal: Spacing.pagePadding,
    marginTop: Spacing.sm,
  },
});
