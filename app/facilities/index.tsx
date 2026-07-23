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
import { PhotoHeader } from "../../src/components/common/PhotoHeader";
import { BlurView } from 'expo-blur';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { KlinkCard } from '../../src/components/common/KlinkCard';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { MemberCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { confirmDelete } from '../../src/utils/confirmDelete';
import { facilitiesApi, Facility } from '../../src/api/facilities';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import { PAGE_SIZE } from '../../src/utils/constants';
import { StaggerDelay } from '../../src/theme/animations';
import { TypewriterText } from '../../src/components/animations/TypewriterText';

// Role gates match the backend exactly: create/edit = Pastor + Manager;
// soft delete = Pastor + Elder (FacilityService).
const CAN_EDIT = ['PASTOR', 'MANAGER'];
const CAN_DELETE = ['PASTOR', 'ELDER'];

const FACILITY_TYPES = [
  'SANCTUARY', 'HALL', 'OFFICE', 'PARKING', 'SCHOOL',
  'CLINIC', 'LAND', 'EQUIPMENT', 'VEHICLE', 'OTHER',
] as const;

const CONDITIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'NEEDS_REPAIR'] as const;

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

export default function FacilitiesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();

  const canEdit = role ? CAN_EDIT.includes(role) : false;
  const canDelete = role ? CAN_DELETE.includes(role) : false;

  // Form state — null editing = create mode
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [facilityType, setFacilityType] = useState<string>('HALL');
  const [condition, setCondition] = useState<string>('GOOD');
  const [address, setAddress] = useState('');
  const [capacity, setCapacity] = useState('');
  const [yearAcquired, setYearAcquired] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['facilities'],
      queryFn: ({ pageParam = 0 }) => facilitiesApi.list({ page: pageParam, size: PAGE_SIZE }),
      getNextPageParam: (last) =>
        last.number + 1 < last.totalPages ? last.number + 1 : undefined,
      initialPageParam: 0,
    });

  const facilities: Facility[] = data?.pages.flatMap((p) => p.content) ?? [];

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setFacilityType('HALL');
    setCondition('GOOD');
    setAddress('');
    setCapacity('');
    setYearAcquired('');
    setEstimatedValue('');
    setNotes('');
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (f: Facility) => {
    setEditing(f);
    setName(f.name);
    setDescription(f.description ?? '');
    setFacilityType(f.facilityType);
    setCondition(f.condition);
    setAddress(f.address ?? '');
    setCapacity(f.capacity != null ? String(f.capacity) : '');
    setYearAcquired(f.yearAcquired != null ? String(f.yearAcquired) : '');
    setEstimatedValue(f.estimatedValue != null ? String(f.estimatedValue) : '');
    setNotes(f.notes ?? '');
    setFormError('');
    setFormOpen(true);
  };

  const buildBody = () => ({
    name: name.trim(),
    facilityType,
    condition,
    description: description.trim() || undefined,
    address: address.trim() || undefined,
    capacity: capacity.trim() ? parseInt(capacity, 10) : undefined,
    yearAcquired: yearAcquired.trim() ? parseInt(yearAcquired, 10) : undefined,
    estimatedValue: estimatedValue.trim() ? parseFloat(estimatedValue) : undefined,
    notes: notes.trim() || undefined,
  });

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () =>
      editing
        ? facilitiesApi.update(editing.id, buildBody())
        : facilitiesApi.create(buildBody()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      haptics.success();
      setFormOpen(false);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not save the facility. Please try again.');
      haptics.error();
    },
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id: string) => facilitiesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      haptics.success();
      setFormOpen(false);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not delete the facility.');
      haptics.error();
    },
  });

  const handleSubmit = () => {
    setFormError('');
    if (!name.trim()) {
      setFormError('Facility name is required.');
      return;
    }
    if (yearAcquired.trim() && !/^(18|19|20)\d{2}$/.test(yearAcquired.trim())) {
      setFormError('Year acquired must be a valid year (1800–2099).');
      return;
    }
    save();
  };

  const handleDelete = () => {
    if (!editing) return;
    confirmDelete({
      title: `Delete ${editing.name}?`,
      message: 'The facility will be removed from your church records.',
      onConfirm: () => remove(editing.id),
    });
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
        <TypewriterText text="Facilities" style={styles.headerTitle} charDelayMs={42} />
        <Text style={styles.headerSub}>Church assets and properties</Text>
      </PhotoHeader>

      {isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 5 }, (_, i) => <MemberCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={facilities}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <FacilityCard
              facility={item}
              index={index}
              theme={theme}
              // EVERYONE opens the detail view (photos, description, details);
              // editing moved to the pencil button (Pastor/Manager only).
              onPress={() => router.push(`/facilities/${item.id}` as any)}
              onEdit={canEdit ? () => openEdit(item) : undefined}
            />
          )}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />}
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: canEdit ? 120 : 100 }}
          ListEmptyComponent={
            <EmptyState
              icon="🏛"
              title="No facilities recorded"
              subtitle={canEdit ? 'Add your first building, land, or equipment.' : 'Church assets will appear here.'}
              actionLabel={canEdit ? '+ Add facility' : undefined}
              onAction={canEdit ? openCreate : undefined}
            />
          }
        />
      )}

      {/* Add FAB — Pastor / Manager */}
      {canEdit && (
        <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            onPress={() => { haptics.medium(); openCreate(); }}
            style={styles.fab}
            accessibilityRole="button"
            accessibilityLabel="Add a facility"
          >
            <LinearGradient colors={Gradients.glory} style={styles.fabGradient}>
              <Text style={styles.fabText}>+ Add facility</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Create / edit modal */}
      <Modal
        visible={formOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFormOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />

            <Text style={styles.modalTitle}>{editing ? 'Edit facility' : 'New facility'}</Text>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
            >
              <KlinkInput
                label="Facility name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                maxLength={200}
              />

              <Text style={styles.chipLabel}>TYPE</Text>
              <View style={styles.chipRow}>
                {FACILITY_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => { haptics.light(); setFacilityType(t); }}
                    style={[styles.chip, facilityType === t && styles.chipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: facilityType === t }}
                  >
                    <Text style={[styles.chipText, facilityType === t && styles.chipTextActive]}>
                      {TYPE_ICON[t]} {t.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.chipLabel}>CONDITION</Text>
              <View style={styles.chipRow}>
                {CONDITIONS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => { haptics.light(); setCondition(c); }}
                    style={[styles.chip, condition === c && styles.chipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: condition === c }}
                  >
                    <Text style={[styles.chipText, condition === c && styles.chipTextActive]}>
                      {c.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <KlinkInput
                label="Description (optional)"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={2000}
              />
              <KlinkInput
                label="Address (optional)"
                value={address}
                onChangeText={setAddress}
                maxLength={500}
              />

              <View style={styles.twoCol}>
                <View style={styles.col}>
                  <Text style={styles.chipLabel}>CAPACITY</Text>
                  <TextInput
                    value={capacity}
                    onChangeText={setCapacity}
                    placeholder="e.g. 300"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    style={styles.plainInput}
                    keyboardType="number-pad"
                    maxLength={7}
                    selectionColor={Colors.gold}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.chipLabel}>YEAR ACQUIRED</Text>
                  <TextInput
                    value={yearAcquired}
                    onChangeText={setYearAcquired}
                    placeholder="e.g. 2015"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    style={styles.plainInput}
                    keyboardType="number-pad"
                    maxLength={4}
                    selectionColor={Colors.gold}
                  />
                </View>
              </View>

              <Text style={styles.chipLabel}>ESTIMATED VALUE (GHS)</Text>
              <TextInput
                value={estimatedValue}
                onChangeText={setEstimatedValue}
                placeholder="0.00"
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={[styles.plainInput, { marginBottom: Spacing.md }]}
                keyboardType="decimal-pad"
                maxLength={14}
                selectionColor={Colors.gold}
              />

              <KlinkInput
                label="Notes (optional)"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                maxLength={2000}
              />

              {formError ? <Text style={styles.formError}>{formError}</Text> : null}

              {editing && canDelete && (
                <TouchableOpacity
                  onPress={handleDelete}
                  style={styles.deleteRow}
                  accessibilityRole="button"
                  accessibilityLabel="Delete facility"
                >
                  <Text style={styles.deleteText}>Delete this facility</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { haptics.light(); setFormOpen(false); }}
                style={styles.modalCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.modalSubmit}>
                <KlinkButton
                  label={editing ? 'Save Changes' : 'Add Facility'}
                  onPress={handleSubmit}
                  disabled={!name.trim() || saving}
                  loading={saving}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function FacilityCard({
  facility,
  index,
  theme,
  onPress,
  onEdit,
}: {
  facility: Facility;
  index: number;
  theme: any;
  onPress?: () => void;
  onEdit?: () => void;
}) {
  const condColor = CONDITION_COLOR[facility.condition] ?? Colors.darkMuted;
  return (
    <ScrollReveal delay={index * StaggerDelay.list} style={styles.cardWrap}>
      <KlinkCard style={styles.card} onPress={onPress}>
        <View style={styles.cardRow}>
          <View style={styles.typeIcon}>
            <Text style={styles.typeEmoji}>{TYPE_ICON[facility.facilityType] ?? '🏛'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.facilityName, { color: theme.text }]} numberOfLines={1}>
              {facility.name}
            </Text>
            <Text style={[styles.facilityType, { color: theme.textMuted }]}>
              {facility.facilityType.replace('_', ' ')}
            </Text>
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.condBadge, { backgroundColor: `${condColor}20` }]}>
              <Text style={[styles.condText, { color: condColor }]}>
                {facility.condition.replace('_', ' ')}
              </Text>
            </View>
            {!facility.isActive && (
              <Text style={[styles.inactiveText, { color: theme.textMuted }]}>Inactive</Text>
            )}
            {onEdit && (
              <TouchableOpacity
                onPress={onEdit}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${facility.name}`}
              >
                <Text style={styles.editIcon}>✎</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {facility.description && (
          <Text style={[styles.desc, { color: theme.textSecondary }]} numberOfLines={2}>
            {facility.description}
          </Text>
        )}
        <Text style={[styles.viewHint, { color: theme.textMuted }]}>Tap to view details & photos ›</Text>
      </KlinkCard>
    </ScrollReveal>
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
  card: {},
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  typeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(45,27,105,0.15)', alignItems: 'center', justifyContent: 'center' },
  typeEmoji: { fontSize: 20 },
  cardInfo: { flex: 1 },
  facilityName: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  facilityType: { fontSize: FontSize.caption, marginTop: 2, textTransform: 'capitalize' },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  condBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3 },
  condText: { fontSize: FontSize.caption, fontWeight: FontWeight.semiBold, textTransform: 'capitalize' },
  inactiveText: { fontSize: FontSize.micro },
  editIcon: { color: Colors.gold, fontSize: 16, marginTop: 2 },
  viewHint: { fontSize: FontSize.micro, marginTop: Spacing.sm },
  desc: { fontSize: FontSize.small, lineHeight: FontSize.small * 1.5, marginTop: Spacing.sm },
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
  chipLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wider,
    marginBottom: 6,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipActive: { borderColor: Colors.gold, backgroundColor: 'rgba(244,164,41,0.18)' },
  chipText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.caption, fontWeight: FontWeight.medium },
  chipTextActive: { color: Colors.gold, fontWeight: FontWeight.semiBold },
  twoCol: { flexDirection: 'row', gap: Spacing.md },
  col: { flex: 1 },
  plainInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: FontSize.body,
    marginBottom: Spacing.md,
  },
  formError: { color: Colors.red, fontSize: FontSize.small, marginTop: Spacing.sm },
  deleteRow: { minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.sm },
  deleteText: { color: Colors.red, fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  modalCancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  modalCancelText: { color: Colors.darkMuted, fontSize: FontSize.body, fontWeight: FontWeight.medium },
  modalSubmit: { flex: 1 },
});
