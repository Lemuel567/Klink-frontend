import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { mediaApi } from '../../src/api/media';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TitheThermometer } from '../../src/components/church/TitheThermometer';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { SermonCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { projectsApi } from '../../src/api/projects';
import { membersApi, Member } from '../../src/api/members';
import { useDebounce } from '../../src/hooks/useDebounce';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { formatCurrency, formatDate } from '../../src/utils/formatters';
import { useRole } from '../../src/store/authStore';

// Contributions are only accepted while the project can still receive funds
const CONTRIBUTABLE = ['APPROVED', 'FUNDRAISING', 'IN_PROGRESS', 'ON_HOLD'];

// Mirror of the backend's status transition map (ProjectService).
// APPROVED is additionally Pastor-only — the backend enforces it too.
const NEXT_STATUSES: Record<string, string[]> = {
  PROPOSED: ['APPROVED', 'CANCELLED'],
  APPROVED: ['FUNDRAISING', 'IN_PROGRESS', 'CANCELLED'],
  FUNDRAISING: ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();

  // Role matrix (matches backend): manage = Pastor + Manager;
  // approve + delete = Pastor only; updates + photos = Pastor/Elder/Manager
  const canManage = role === 'PASTOR' || role === 'MANAGER';
  const isPastor = role === 'PASTOR';
  const canPost = role === 'PASTOR' || role === 'ELDER' || role === 'MANAGER';
  // Contribution recording (cash/cheque/MoMo/transfer) is FinSec-only — backend rule
  const isFinSec = role === 'FINANCIAL_SECRETARY';

  const [composing, setComposing] = useState(false);
  const [updTitle, setUpdTitle] = useState('');
  const [updContent, setUpdContent] = useState('');
  const [addingPhoto, setAddingPhoto] = useState(false);

  // FinSec: record an offline contribution on behalf of a member
  const [recording, setRecording] = useState(false);
  const [contribMember, setContribMember] = useState<Member | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [contribAmount, setContribAmount] = useState('');
  const [contribMethod, setContribMethod] = useState('CASH');
  const [contribNotes, setContribNotes] = useState('');
  const debouncedSearch = useDebounce(memberSearch, 350);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  const { data: summary } = useQuery({
    queryKey: ['project-summary', id],
    queryFn: () => projectsApi.getContributionSummary(id!),
    enabled: !!id,
  });

  // Updates timeline + photo gallery
  const { data: updates } = useQuery({
    queryKey: ['project-updates', id],
    queryFn: () => projectsApi.listUpdates(id!, { size: 10 }),
    enabled: !!id,
  });
  const { data: images } = useQuery({
    queryKey: ['project-images', id],
    queryFn: () => projectsApi.listImages(id!),
    enabled: !!id,
  });

  // Member search for the FinSec contribution recorder (min 2 chars, debounced)
  const { data: memberResults } = useQuery({
    queryKey: ['members', 'contrib-search', debouncedSearch],
    queryFn: () => membersApi.list({ search: debouncedSearch, size: 8 }),
    enabled: recording && !contribMember && debouncedSearch.length >= 2,
  });

  const { mutate: recordContribution, isPending: recordingContrib } = useMutation({
    mutationFn: () =>
      projectsApi.recordContribution(id!, {
        memberId: contribMember!.id,
        amount: parseFloat(contribAmount),
        contributionDate: new Date().toISOString().split('T')[0],
        paymentMethod: contribMethod,
        notes: contribNotes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['project-summary', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      haptics.success();
      setRecording(false);
      setContribMember(null);
      setMemberSearch('');
      setContribAmount('');
      setContribNotes('');
    },
    onError: (err: any) => {
      haptics.error();
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not record the contribution.');
    },
  });

  const { mutate: postUpdate, isPending: postingUpdate } = useMutation({
    mutationFn: () => projectsApi.postUpdate(id!, { title: updTitle.trim(), content: updContent.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-updates', id] });
      haptics.success();
      setComposing(false);
      setUpdTitle('');
      setUpdContent('');
    },
    onError: (err: any) => {
      haptics.error();
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not post the update.');
    },
  });

  const addPhoto = async () => {
    haptics.light();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    try {
      setAddingPhoto(true);
      const uri = result.assets[0].uri;
      const name = uri.split('/').pop() ?? 'photo.jpg';
      const ext = name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const uploaded = await mediaApi.upload(
        { uri, name, type: ext === 'png' ? 'image/png' : 'image/jpeg' },
        'projects',
      );
      await projectsApi.addImage(id!, {
        imageUrl: uploaded.imageUrl,
        isPrimary: (images?.length ?? 0) === 0, // first photo becomes the cover
      });
      queryClient.invalidateQueries({ queryKey: ['project-images', id] });
      haptics.success();
    } catch (err: any) {
      haptics.error();
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not add the photo.');
    } finally {
      setAddingPhoto(false);
    }
  };

  const confirmDeletePhoto = (imageId: string) => {
    haptics.medium();
    Alert.alert('Remove photo?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await projectsApi.deleteImage(id!, imageId);
            queryClient.invalidateQueries({ queryKey: ['project-images', id] });
            haptics.success();
          } catch (err: any) {
            Alert.alert('Error', err?.friendlyMessage ?? 'Could not remove the photo.');
          }
        },
      },
    ]);
  };

  const { mutate: changeStatus, isPending: changingStatus } = useMutation({
    mutationFn: (status: string) => projectsApi.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      haptics.success();
    },
    onError: (err: any) => {
      haptics.error();
      Alert.alert('Not allowed', err?.friendlyMessage ?? 'Could not change the status.');
    },
  });

  const { mutate: removeProject, isPending: deleting } = useMutation({
    mutationFn: () => projectsApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      haptics.success();
      router.back();
    },
    onError: (err: any) => {
      haptics.error();
      Alert.alert('Not allowed', err?.friendlyMessage ?? 'Could not delete the project.');
    },
  });

  const confirmStatus = (status: string) => {
    haptics.light();
    Alert.alert('Change status', `Mark this project as ${status.replace('_', ' ')}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => changeStatus(status) },
    ]);
  };

  const confirmDelete = () => {
    haptics.medium();
    Alert.alert('Delete project?', 'This hides the project and its records from the church. This is the Pastor’s call alone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeProject() },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[{ flex: 1, backgroundColor: theme.background }]}>
        <SermonCardSkeleton />
      </View>
    );
  }

  if (!project) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero */}
        <LinearGradient
          colors={Gradients.darkWorship}
          style={[styles.hero, { paddingTop: insets.top + 16 }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <View style={styles.statusBadge}>
            <Text style={[styles.statusText, { color: Colors.gold }]}>{project.status.replace('_', ' ')}</Text>
          </View>

          <Text style={styles.title}>{project.title}</Text>
          {project.description && (
            <Text style={styles.desc}>{project.description}</Text>
          )}

          <TitheThermometer
            raised={project.amountRaised}
            target={project.targetAmount}
            currency={project.currency}
            style={styles.thermo}
          />

          {CONTRIBUTABLE.includes(project.status) && (
            <KlinkButton
              label="Contribute with Paystack"
              onPress={() => {
                haptics.medium();
                router.push({
                  pathname: '/giving/pay',
                  params: { projectId: project.id, projectTitle: project.title },
                });
              }}
            />
          )}
          {isFinSec && CONTRIBUTABLE.includes(project.status) && (
            <KlinkButton
              label="Record offline contribution"
              variant="secondary"
              onPress={() => { haptics.medium(); setRecording(true); }}
            />
          )}
        </LinearGradient>

        {/* Details */}
        <ScrollReveal delay={0}>
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: Colors.gold }]}>PROJECT DETAILS</Text>
            <InfoRow label="Type" value={project.projectType.replace('_', ' ')} theme={theme} />
            {project.location && <InfoRow label="Location" value={project.location} theme={theme} />}
            {project.contractor && <InfoRow label="Contractor" value={project.contractor} theme={theme} />}
            {project.startDate && <InfoRow label="Started" value={formatDate(project.startDate)} theme={theme} />}
            {project.expectedEndDate && <InfoRow label="Expected end" value={formatDate(project.expectedEndDate)} theme={theme} />}
            <InfoRow label="Target amount" value={formatCurrency(project.targetAmount, project.currency)} theme={theme} />
            <InfoRow label="Amount raised" value={formatCurrency(project.amountRaised, project.currency)} theme={theme} valueColor={Colors.gold} />
            {summary && <InfoRow label="Contributors" value={String(summary.contributorCount)} theme={theme} />}
          </View>
        </ScrollReveal>

        {/* Photo gallery — all roles view; Pastor/Elder/Manager add (long-press to remove) */}
        <ScrollReveal delay={60}>
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: Colors.gold, marginBottom: 0 }]}>PHOTOS</Text>
              {canPost && (
                <TouchableOpacity
                  onPress={addPhoto}
                  disabled={addingPhoto}
                  style={styles.addLink}
                  accessibilityRole="button"
                  accessibilityLabel="Add a photo"
                >
                  {addingPhoto ? (
                    <ActivityIndicator size="small" color={Colors.gold} />
                  ) : (
                    <Text style={styles.addLinkText}>+ Add photo</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
            {(images?.length ?? 0) > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
                {images!.map((img) => (
                  <TouchableOpacity
                    key={img.id}
                    activeOpacity={0.9}
                    onLongPress={canPost ? () => confirmDeletePhoto(img.id) : undefined}
                    accessibilityLabel={img.caption ?? 'Project photo'}
                  >
                    <ExpoImage
                      source={{ uri: img.imageUrl }}
                      style={styles.galleryImg}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={{ color: theme.textMuted, fontSize: FontSize.small }}>
                {canPost ? 'No photos yet — add the first one.' : 'No photos yet.'}
              </Text>
            )}
          </View>
        </ScrollReveal>

        {/* Updates timeline — all roles view; Pastor/Elder/Manager post */}
        <ScrollReveal delay={80}>
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: Colors.gold, marginBottom: 0 }]}>UPDATES</Text>
              {canPost && (
                <TouchableOpacity
                  onPress={() => { haptics.light(); setComposing(true); }}
                  style={styles.addLink}
                  accessibilityRole="button"
                  accessibilityLabel="Post an update"
                >
                  <Text style={styles.addLinkText}>+ Post update</Text>
                </TouchableOpacity>
              )}
            </View>
            {(updates?.content?.length ?? 0) > 0 ? (
              updates!.content.map((u) => (
                <View key={u.id} style={styles.updateItem}>
                  <View style={styles.updateDot} />
                  <View style={styles.updateBody}>
                    <Text style={[styles.updateTitle, { color: theme.text }]}>{u.title}</Text>
                    <Text style={[styles.updateContent, { color: theme.textSecondary }]}>{u.content}</Text>
                    <Text style={[styles.updateDate, { color: theme.textMuted }]}>
                      {formatDate(u.postedAt)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ color: theme.textMuted, fontSize: FontSize.small }}>
                {canPost ? 'No updates yet — share the first progress report.' : 'No updates yet.'}
              </Text>
            )}
          </View>
        </ScrollReveal>

        {/* Manage — Pastor + Manager only; approval/deletion Pastor only */}
        {canManage && (
          <ScrollReveal delay={100}>
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: Colors.gold }]}>MANAGE PROJECT</Text>
              {(NEXT_STATUSES[project.status] ?? [])
                .filter((s) => s !== 'APPROVED' || isPastor)
                .map((s) => (
                  <TouchableOpacity
                    key={s}
                    disabled={changingStatus}
                    onPress={() => confirmStatus(s)}
                    style={styles.manageBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Mark as ${s.replace('_', ' ')}`}
                  >
                    <Text style={styles.manageBtnText}>
                      Mark as {s.replace('_', ' ').toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              {(NEXT_STATUSES[project.status] ?? []).length === 0 && (
                <Text style={{ color: theme.textMuted, fontSize: FontSize.small }}>
                  This project is {project.status.toLowerCase()} — no further status changes.
                </Text>
              )}
              {isPastor && (
                <TouchableOpacity
                  disabled={deleting}
                  onPress={confirmDelete}
                  style={[styles.manageBtn, styles.deleteBtn]}
                  accessibilityRole="button"
                  accessibilityLabel="Delete project"
                >
                  <Text style={styles.deleteBtnText}>
                    {deleting ? 'Deleting…' : 'Delete project'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollReveal>
        )}
      </ScrollView>

      {/* Post-update compose modal */}
      <Modal visible={composing} transparent animationType="fade" onRequestClose={() => setComposing(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />
            <Text style={styles.modalTitle}>Project update</Text>
            <Text style={styles.modalSub}>All contributors are notified when you post.</Text>
            <KlinkInput label="Title" value={updTitle} onChangeText={setUpdTitle} maxLength={300} autoCapitalize="sentences" />
            <KlinkInput
              label="What's the progress?"
              value={updContent}
              onChangeText={setUpdContent}
              multiline
              numberOfLines={6}
              maxLength={10000}
              autoCapitalize="sentences"
              blurOnSubmit={false}
            />
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
                  label="Post update"
                  onPress={() => { if (updTitle.trim() && updContent.trim()) postUpdate(); }}
                  disabled={!updTitle.trim() || !updContent.trim() || postingUpdate}
                  loading={postingUpdate}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* FinSec: record-contribution modal (cash / cheque / MoMo / transfer) */}
      <Modal visible={recording} transparent animationType="fade" onRequestClose={() => setRecording(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />
            <Text style={styles.modalTitle}>Record contribution</Text>
            <Text style={styles.modalSub}>The member is thanked with a notification when you save.</Text>

            {/* Member picker — debounced church directory search */}
            {contribMember ? (
              <View style={styles.pickedMemberRow}>
                <Text style={styles.pickedMemberName} numberOfLines={1}>{contribMember.fullName}</Text>
                <TouchableOpacity
                  onPress={() => { haptics.light(); setContribMember(null); setMemberSearch(''); }}
                  style={styles.pickedMemberClear}
                  accessibilityRole="button"
                  accessibilityLabel="Change member"
                >
                  <Text style={styles.pickedMemberClearText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TextInput
                  value={memberSearch}
                  onChangeText={setMemberSearch}
                  placeholder="Search member by name or phone…"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={styles.memberSearchInput}
                  selectionColor={Colors.gold}
                  autoCapitalize="none"
                />
                {(memberResults?.content?.length ?? 0) > 0 && (
                  <View style={styles.memberResults}>
                    {memberResults!.content.map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => { haptics.light(); setContribMember(m); }}
                        style={styles.memberResultRow}
                        accessibilityRole="button"
                        accessibilityLabel={m.fullName}
                      >
                        <Text style={styles.memberResultName} numberOfLines={1}>{m.fullName}</Text>
                        {m.phone ? <Text style={styles.memberResultPhone}>{m.phone}</Text> : null}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Amount — label-above big input (no floating-label collision) */}
            <Text style={styles.amountLabel}>AMOUNT (GHS)</Text>
            <TextInput
              value={contribAmount}
              onChangeText={setContribAmount}
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.3)"
              style={styles.amountInput}
              keyboardType="decimal-pad"
              maxLength={12}
              selectionColor={Colors.gold}
            />

            <Text style={styles.amountLabel}>PAYMENT METHOD</Text>
            <View style={styles.methodRow}>
              {['CASH', 'CHEQUE', 'MOBILE_MONEY', 'BANK_TRANSFER'].map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => { haptics.light(); setContribMethod(m); }}
                  style={[styles.methodChip, contribMethod === m && styles.methodChipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: contribMethod === m }}
                >
                  <Text style={[styles.methodChipText, contribMethod === m && styles.methodChipTextActive]}>
                    {m.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <KlinkInput
              label="Notes (optional)"
              value={contribNotes}
              onChangeText={setContribNotes}
              maxLength={1000}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { haptics.light(); setRecording(false); }}
                style={styles.modalCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <KlinkButton
                  label="Record"
                  onPress={() => {
                    const amt = parseFloat(contribAmount);
                    if (contribMember && !isNaN(amt) && amt > 0) recordContribution();
                  }}
                  disabled={!contribMember || !(parseFloat(contribAmount) > 0) || recordingContrib}
                  loading={recordingContrib}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value, theme, valueColor }: { label: string; value: string; theme: any; valueColor?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: valueColor ?? theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingHorizontal: Spacing.pagePadding,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
    position: 'relative',
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32 },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(244,164,41,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontSize: FontSize.caption, fontWeight: FontWeight.semiBold },
  title: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.tight },
  desc: { color: 'rgba(245,245,245,0.75)', fontSize: FontSize.body, lineHeight: FontSize.body * 1.6 },
  thermo: { marginTop: Spacing.sm },
  section: { margin: Spacing.pagePadding, borderRadius: BorderRadius.xl, padding: Spacing.md, gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.caption, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.widest, marginBottom: 4 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  infoLabel: { fontSize: FontSize.small },
  infoValue: { fontSize: FontSize.small, fontWeight: FontWeight.medium },
  manageBtn: {
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: BorderRadius.lg,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  manageBtnText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.bold },
  deleteBtn: { borderColor: 'rgba(220,38,38,0.7)', marginTop: Spacing.md },
  deleteBtnText: { color: Colors.red, fontSize: FontSize.small, fontWeight: FontWeight.bold },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  addLink: { minHeight: 32, justifyContent: 'center' },
  addLinkText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.bold },
  galleryRow: { gap: Spacing.sm },
  galleryImg: { width: 140, height: 100, borderRadius: BorderRadius.lg },

  updateItem: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.xs },
  updateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
    marginTop: 6,
  },
  updateBody: { flex: 1, gap: 2 },
  updateTitle: { fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  updateContent: { fontSize: FontSize.small, lineHeight: FontSize.small * 1.5 },
  updateDate: { fontSize: FontSize.caption },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: Spacing.pagePadding,
  },
  modalCard: { borderRadius: BorderRadius.xxl, overflow: 'hidden', padding: Spacing.lg, gap: Spacing.sm },
  modalGlass: {
    borderRadius: BorderRadius.xxl,
    backgroundColor: 'rgba(26,19,64,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  modalTitle: { color: Colors.white, fontSize: FontSize.h4, fontWeight: FontWeight.bold },
  modalSub: { color: 'rgba(255,255,255,0.55)', fontSize: FontSize.caption, marginBottom: Spacing.xs },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  modalCancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  modalCancelText: { color: Colors.darkMuted, fontSize: FontSize.body, fontWeight: FontWeight.medium },

  // FinSec record-contribution modal
  pickedMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.4)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  pickedMemberName: { color: Colors.white, fontSize: FontSize.body, fontWeight: FontWeight.semiBold, flex: 1 },
  pickedMemberClear: { minHeight: 44, justifyContent: 'center', paddingLeft: Spacing.sm },
  pickedMemberClearText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  memberSearchInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: FontSize.body,
  },
  memberResults: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  memberResultRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    minHeight: 44,
    justifyContent: 'center',
  },
  memberResultName: { color: Colors.white, fontSize: FontSize.small, fontWeight: FontWeight.medium },
  memberResultPhone: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.caption, marginTop: 1 },
  amountLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wider,
    marginTop: Spacing.xs,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.3)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
  },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  methodChip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  methodChipActive: { borderColor: Colors.gold, backgroundColor: 'rgba(244,164,41,0.18)' },
  methodChipText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.caption, fontWeight: FontWeight.medium },
  methodChipTextActive: { color: Colors.gold, fontWeight: FontWeight.semiBold },
});
