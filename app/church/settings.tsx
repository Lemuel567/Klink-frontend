import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { KlinkToast } from '../../src/components/common/KlinkToast';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { churchApi } from '../../src/api/church';
import { useUser } from '../../src/store/authStore';
import { confirmAction } from '../../src/utils/confirmDelete';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { formatDate } from '../../src/utils/formatters';

// Roles that can edit church settings
const CAN_EDIT = ['PASTOR', 'ELDER'];
// Only Elder can delete the church
const CAN_DELETE = ['ELDER'];

export default function ChurchSettingsScreen() {
  const { theme } = useTheme();
  const user = useUser();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const queryClient = useQueryClient();

  const canEdit = CAN_EDIT.includes(user?.role ?? '');
  const canDelete = CAN_DELETE.includes(user?.role ?? '');

  // Form state
  const [churchName, setChurchName] = useState('');
  const [location, setLocation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [welfareAmount, setWelfareAmount] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') =>
    setToast({ message, type });

  const { data: church, isLoading } = useQuery({
    queryKey: ['churchSettings'],
    queryFn: churchApi.getSettings,
    staleTime: 0,
  });

  // Populate form once data loads — skip if already initialised
  useEffect(() => {
    if (church && !hydrated) {
      setChurchName(church.churchName ?? '');
      setLocation(church.location ?? '');
      setContactPhone(church.contactPhone ?? '');
      setContactEmail(church.contactEmail ?? '');
      setWelfareAmount(church.welfareAmount != null ? String(church.welfareAmount) : '');
      setHydrated(true);
    }
  }, [church, hydrated]);

  // ── Save settings ──────────────────────────────────────────────────────────
  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () =>
      churchApi.updateSettings({
        churchName: churchName.trim() || undefined,
        location: location.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        welfareAmount: welfareAmount.trim() ? parseFloat(welfareAmount) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['churchSettings'] });
      haptics.medium();
      showToast('Settings saved', 'success');
    },
    onError: () => {
      haptics.heavy();
      showToast('Could not save settings', 'error');
    },
  });

  const handleSave = () => {
    if (!churchName.trim()) {
      showToast('Church name is required', 'error');
      return;
    }
    save();
  };

  // ── Regenerate join code ───────────────────────────────────────────────────
  const { mutate: regenerate, isPending: regenerating } = useMutation({
    mutationFn: churchApi.regenerateCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['churchSettings'] });
      haptics.medium();
      showToast('New join code generated', 'success');
    },
    onError: () => {
      haptics.heavy();
      showToast('Could not regenerate code', 'error');
    },
  });

  const confirmRegenerate = () => {
    confirmAction({
      title: 'Regenerate join code?',
      message: 'The current code will stop working immediately. Members who have not yet joined will need the new code.',
      confirmLabel: 'Regenerate',
      onConfirm: () => regenerate(),
    });
  };

  // ── Copy join code ─────────────────────────────────────────────────────────
  const handleCopyCode = async () => {
    if (!church?.churchCode) return;
    await Clipboard.setStringAsync(church.churchCode);
    haptics.light();
    showToast('Join code copied', 'success');
  };

  // ── Delete church ──────────────────────────────────────────────────────────
  const { mutate: deleteChurch, isPending: deleting } = useMutation({
    mutationFn: churchApi.deleteChurch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['churchSettings'] });
      haptics.heavy();
      showToast('Church scheduled for deletion', 'warning' as any);
    },
    onError: () => {
      haptics.heavy();
      showToast('Could not delete church', 'error');
    },
  });

  const confirmDelete = () => {
    Alert.alert(
      'Delete church?',
      'This will schedule your church for permanent deletion in 30 days. You can restore it within that window. All member data will be permanently lost after 30 days.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              `Type "DELETE" to confirm you want to delete ${church?.churchName}.`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Yes, delete', style: 'destructive', onPress: () => deleteChurch() },
              ],
            );
          },
        },
      ],
    );
  };

  // ── Restore church ─────────────────────────────────────────────────────────
  const { mutate: restoreChurch, isPending: restoring } = useMutation({
    mutationFn: churchApi.restoreChurch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['churchSettings'] });
      haptics.medium();
      showToast('Church restored successfully', 'success');
    },
    onError: () => {
      haptics.heavy();
      showToast('Could not restore church', 'error');
    },
  });

  const isScheduledForDeletion = !!church?.deletedAt;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ── Header ── */}
      <LinearGradient
        colors={Gradients.darkWorship}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.headerBack}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Church Settings</Text>

        {canEdit ? (
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || isLoading}
            style={styles.headerBtn}
            accessibilityLabel="Save settings"
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.headerSave, (saving || isLoading) && styles.dimmed]}>Save</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Deletion warning banner ── */}
          {isScheduledForDeletion && (
            <ScrollReveal delay={0}>
              <View style={styles.deletionBanner}>
                <Text style={styles.deletionIcon}>⚠</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deletionTitle}>Church scheduled for deletion</Text>
                  {church?.scheduledDeletionAt && (
                    <Text style={styles.deletionSub}>
                      Permanent deletion: {formatDate(church.scheduledDeletionAt)}
                    </Text>
                  )}
                </View>
                {canDelete && (
                  <TouchableOpacity
                    onPress={() => restoreChurch()}
                    disabled={restoring}
                    style={styles.restoreBtn}
                    accessibilityRole="button"
                  >
                    <Text style={styles.restoreBtnText}>Restore</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollReveal>
          )}

          {/* ── Church info card ── */}
          <ScrollReveal delay={60}>
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionLabel, { color: Colors.gold }]}>CHURCH INFO</Text>

              {canEdit ? (
                <>
                  <KlinkInput
                    label="Church name"
                    value={churchName}
                    onChangeText={setChurchName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    editable={!saving}
                  />
                  <KlinkInput
                    label="Location"
                    value={location}
                    onChangeText={setLocation}
                    autoCapitalize="sentences"
                    returnKeyType="next"
                    editable={!saving}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </>
              ) : (
                <>
                  <InfoRow label="Church name" value={church?.churchName ?? '—'} theme={theme} />
                  <InfoRow label="Location" value={church?.location ?? '—'} theme={theme} last />
                </>
              )}
            </View>
          </ScrollReveal>

          {/* ── Read-only church details ── */}
          <ScrollReveal delay={100}>
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionLabel, { color: Colors.gold }]}>DETAILS</Text>
              <InfoRow label="Denomination" value={church?.denomination ?? '—'} theme={theme} />
              <InfoRow
                label="Founded"
                value={church?.createdAt ? formatDate(church.createdAt) : '—'}
                theme={theme}
                last
              />
            </View>
          </ScrollReveal>

          {/* ── Contact card ── */}
          <ScrollReveal delay={140}>
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionLabel, { color: Colors.gold }]}>CONTACT</Text>

              {canEdit ? (
                <>
                  <KlinkInput
                    label="Contact phone"
                    value={contactPhone}
                    onChangeText={setContactPhone}
                    keyboardType="phone-pad"
                    returnKeyType="next"
                    editable={!saving}
                  />
                  <KlinkInput
                    label="Contact email"
                    value={contactEmail}
                    onChangeText={setContactEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="done"
                    editable={!saving}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </>
              ) : (
                <>
                  <InfoRow label="Phone" value={church?.contactPhone ?? '—'} theme={theme} />
                  <InfoRow label="Email" value={church?.contactEmail ?? '—'} theme={theme} last />
                </>
              )}
            </View>
          </ScrollReveal>

          {/* ── Welfare card (Pastor / Elder only) ── */}
          {canEdit && (
            <ScrollReveal delay={180}>
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <Text style={[styles.sectionLabel, { color: Colors.gold }]}>FINANCES</Text>
                <KlinkInput
                  label="Monthly welfare amount (GHS)"
                  value={welfareAmount}
                  onChangeText={setWelfareAmount}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  editable={!saving}
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>
            </ScrollReveal>
          )}

          {/* ── Join code card ── */}
          <ScrollReveal delay={220}>
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionLabel, { color: Colors.gold }]}>MEMBER JOIN CODE</Text>
              <Text style={[styles.codeHint, { color: theme.textMuted }]}>
                Share this code with new members so they can register
              </Text>

              {/* Code display */}
              <TouchableOpacity
                onPress={handleCopyCode}
                style={styles.codeBox}
                accessibilityLabel="Copy join code"
                accessibilityRole="button"
              >
                <Text style={styles.codeText}>{church?.churchCode ?? '——'}</Text>
                <View style={styles.copyBadge}>
                  <Text style={styles.copyBadgeText}>Copy</Text>
                </View>
              </TouchableOpacity>

              {/* Regenerate — Pastor / Elder only */}
              {canEdit && (
                <TouchableOpacity
                  onPress={confirmRegenerate}
                  disabled={regenerating}
                  style={[styles.regenBtn, regenerating && styles.dimmed]}
                  accessibilityRole="button"
                >
                  <Text style={styles.regenBtnText}>
                    {regenerating ? 'Regenerating…' : '↺  Generate new code'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollReveal>

          {/* ── Save button (Pastor / Elder) ── */}
          {canEdit && (
            <ScrollReveal delay={260}>
              <View style={styles.actionWrap}>
                <KlinkButton
                  label="Save settings"
                  onPress={handleSave}
                  loading={saving}
                  disabled={isLoading}
                />
              </View>
            </ScrollReveal>
          )}

          {/* ── Danger zone (Elder only) ── */}
          {canDelete && !isScheduledForDeletion && (
            <ScrollReveal delay={300}>
              <View style={[styles.card, styles.dangerCard]}>
                <Text style={styles.dangerTitle}>Danger Zone</Text>
                <Text style={[styles.dangerDesc, { color: theme.textMuted }]}>
                  Permanently deletes all church data after a 30-day grace period. This cannot be undone after 30 days.
                </Text>
                <TouchableOpacity
                  onPress={confirmDelete}
                  disabled={deleting}
                  style={[styles.deleteBtn, deleting && styles.dimmed]}
                  accessibilityRole="button"
                >
                  <Text style={styles.deleteBtnText}>
                    {deleting ? 'Deleting…' : 'Delete church'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollReveal>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {toast && (
        <KlinkToast
          message={toast.message}
          type={toast.type as any}
          visible
          onHide={() => setToast(null)}
        />
      )}
    </View>
  );
}

function InfoRow({
  label,
  value,
  theme,
  last,
}: {
  label: string;
  value: string;
  theme: any;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        !last && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
      ]}
    >
      <Text style={[styles.infoLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.text }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.pagePadding,
    paddingBottom: Spacing.md,
  },
  headerBtn: { minWidth: 52, alignItems: 'center' },
  headerBack: {
    color: Colors.white,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: FontWeight.regular,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSize.h4,
    fontWeight: FontWeight.bold,
  },
  headerSave: {
    color: Colors.gold,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semiBold,
  },

  // ── Layout ──────────────────────────────────────────────────────────────────
  scroll: {
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    marginHorizontal: Spacing.pagePadding,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.widest,
    marginBottom: Spacing.xs,
  },
  actionWrap: {
    paddingHorizontal: Spacing.pagePadding,
  },

  // ── Info rows ───────────────────────────────────────────────────────────────
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  infoLabel: { fontSize: FontSize.small, flex: 0.45 },
  infoValue: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.medium,
    flex: 0.55,
    textAlign: 'right',
  },

  // ── Join code ───────────────────────────────────────────────────────────────
  codeHint: {
    fontSize: FontSize.caption,
    marginBottom: Spacing.xs,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(244,164,41,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.3)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  codeText: {
    color: Colors.gold,
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.wider,
  },
  copyBadge: {
    backgroundColor: 'rgba(244,164,41,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  copyBadgeText: {
    color: Colors.gold,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semiBold,
  },
  regenBtn: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  regenBtnText: {
    color: Colors.gold,
    fontSize: FontSize.small,
    fontWeight: FontWeight.medium,
  },

  // ── Deletion banner ─────────────────────────────────────────────────────────
  deletionBanner: {
    marginHorizontal: Spacing.pagePadding,
    backgroundColor: 'rgba(220,38,38,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.4)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  deletionIcon: { fontSize: 20, color: Colors.red },
  deletionTitle: {
    color: Colors.red,
    fontSize: FontSize.small,
    fontWeight: FontWeight.semiBold,
  },
  deletionSub: {
    color: Colors.red,
    fontSize: FontSize.caption,
    opacity: 0.8,
    marginTop: 2,
  },
  restoreBtn: {
    backgroundColor: Colors.red,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  restoreBtnText: {
    color: Colors.white,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semiBold,
  },

  // ── Danger zone ─────────────────────────────────────────────────────────────
  dangerCard: {
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.3)',
  },
  dangerTitle: {
    color: Colors.red,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
  dangerDesc: {
    fontSize: FontSize.small,
    lineHeight: FontSize.small * 1.6,
  },
  deleteBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.red,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  deleteBtnText: {
    color: Colors.red,
    fontSize: FontSize.small,
    fontWeight: FontWeight.semiBold,
  },

  // ── Shared ──────────────────────────────────────────────────────────────────
  dimmed: { opacity: 0.4 },
});
