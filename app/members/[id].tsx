import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KlinkAvatar, RoleBadge } from '../../src/components/common/KlinkAvatar';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { MemberCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { membersApi } from '../../src/api/members';
import { useRole } from '../../src/store/authStore';
import { confirmDeactivate, confirmReactivate } from '../../src/utils/confirmDelete';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { formatDate, formatPhoneDisplay, formatRole } from '../../src/utils/formatters';

// Real backend Role enum — assignment rules are enforced server-side
// (Pastor appoints Elders/Managers; only an Elder appoints a Pastor; etc.)
// and any rejection surfaces its exact message.
const ASSIGNABLE_ROLES: { key: string; label: string; desc: string; color: string }[] = [
  { key: 'PASTOR', label: 'Pastor', desc: 'Church shepherd — only an Elder can appoint', color: Colors.gold },
  { key: 'ELDER', label: 'Elder', desc: 'Senior leader and counselor (max 25)', color: Colors.roseGold },
  { key: 'MANAGER', label: 'Manager', desc: 'Content, store, attendance, facilities (max 10)', color: Colors.blue },
  { key: 'FINANCIAL_SECRETARY', label: 'Financial Secretary', desc: 'Records and manages church finances', color: Colors.green },
  { key: 'GROUP_ADMIN', label: 'Group Admin', desc: 'Posts messages in their group', color: '#9D6FD4' },
  { key: 'GROUP_FINANCIAL_SECRETARY', label: 'Group Fin. Secretary', desc: 'Records group dues', color: '#1D9E75' },
  { key: 'MEMBER', label: 'Member', desc: 'Regular church member', color: Colors.darkMuted },
];

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();

  const canDeactivate = role === 'PASTOR' || role === 'ELDER';
  const canReactivate = role === 'PASTOR' || role === 'ELDER' || role === 'MANAGER';

  const { data: member, isLoading } = useQuery({
    queryKey: ['member', id],
    queryFn: () => membersApi.get(id!),
    enabled: !!id,
  });

  const { mutate: deactivate, isPending: deactivating } = useMutation({
    mutationFn: () => membersApi.deactivate(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member', id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      haptics.medium();
    },
  });

  const { mutate: reactivate, isPending: reactivating } = useMutation({
    mutationFn: () => membersApi.reactivate(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member', id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      haptics.medium();
    },
  });

  const { mutate: assignRole, isPending: assigningRole } = useMutation({
    mutationFn: (newRole: string) => membersApi.assignRole(id!, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member', id] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      haptics.success();
      Alert.alert('Role updated', 'Their permissions change immediately.');
    },
    onError: (err: any) => {
      haptics.error();
      // Backend messages are specific ("Only an Elder can appoint a Pastor" …)
      Alert.alert('Not allowed', err?.friendlyMessage ?? 'Could not change the role.');
    },
  });

  const confirmAssignRole = (memberName: string, newRole: { key: string; label: string }) => {
    haptics.light();
    Alert.alert(
      'Change role',
      `Make ${memberName} ${newRole.label}? This updates their app permissions immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => assignRole(newRole.key) },
      ],
    );
  };

  // Leaders manage roles; backend enforces the exact rules per caller role
  const canManageRoles = role === 'PASTOR' || role === 'ELDER' || role === 'MANAGER';

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <MemberCardSkeleton />
      </View>
    );
  }

  // Failed/404 fetch: show a message with a way back, never a blank modal.
  if (!member) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LinearGradient colors={Gradients.darkWorship} style={[styles.hero, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
         
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.name}>Couldn't load this member</Text>
        </LinearGradient>
        <Text style={{ color: theme.textMuted, textAlign: 'center', padding: 24 }}>
          The profile may be unavailable, or your connection dropped. Go back and try again.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Hero */}
      <LinearGradient
        colors={Gradients.darkWorship}
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

        <KlinkAvatar name={member.fullName} photoUrl={member.photoUrl} size={88} />
        <Text style={styles.name}>{member.fullName}</Text>
        <RoleBadge role={member.role} />
        {member.status === 'DEACTIVATED' && (
          <View style={styles.deactivatedBadge}>
            <Text style={styles.deactivatedText}>Account deactivated</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: Spacing.pagePadding, gap: Spacing.md, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <ScrollReveal delay={0}>
          <InfoSection title="Contact information" theme={theme}>
            {member.email && <InfoRow label="Email" value={member.email} theme={theme} />}
            {member.phoneNumber && (
              <InfoRow label="Phone" value={formatPhoneDisplay(member.phoneNumber)} theme={theme} />
            )}
            {member.phone && member.phone !== member.phoneNumber && (
              <InfoRow label="Display phone" value={member.phone} theme={theme} />
            )}
          </InfoSection>
        </ScrollReveal>

        {/* Hidden entirely for the directory view (regular members see name + phone only) */}
        {member.role && (
          <ScrollReveal delay={100}>
            <InfoSection title="Church profile" theme={theme}>
              <InfoRow label="Role" value={formatRole(member.role)} theme={theme} />
              {member.category && <InfoRow label="Category" value={member.category} theme={theme} />}
              {member.createdAt && (
                <InfoRow label="Member since" value={formatDate(member.createdAt)} theme={theme} />
              )}
              {member.dateOfBirth && (
                <InfoRow label="Date of birth" value={formatDate(member.dateOfBirth)} theme={theme} />
              )}
            </InfoSection>
          </ScrollReveal>
        )}

        <ScrollReveal delay={200}>
          {member.role ? (
            <InfoSection title="Verification" theme={theme}>
              <InfoRow
                label="Email verified"
                value={member.emailVerified ? 'Yes' : 'No'}
                valueColor={member.emailVerified ? Colors.green : Colors.red}
                theme={theme}
              />
              <InfoRow
                label="Phone verified"
                value={member.phoneVerified ? 'Yes' : 'No'}
                valueColor={member.phoneVerified ? Colors.green : Colors.red}
                theme={theme}
              />
              <InfoRow
                label="Device type"
                value={member.hasSmartphone ? 'Smartphone' : 'Basic phone'}
                theme={theme}
              />
            </InfoSection>
          ) : null}
        </ScrollReveal>

        {/* Member management — change role (leaders only, full view only) */}
        {canManageRoles && member.role && member.status === 'ACTIVE' && (
          <ScrollReveal delay={250}>
            <InfoSection title="Member management" theme={theme}>
              <Text style={[styles.roleHint, { color: theme.textMuted }]}>
                Tap a role to assign it. Current role is highlighted.
              </Text>
              {ASSIGNABLE_ROLES.map((r) => {
                const isCurrent = member.role === r.key;
                return (
                  <TouchableOpacity
                    key={r.key}
                    disabled={isCurrent || assigningRole}
                    onPress={() => confirmAssignRole(member.fullName, r)}
                    style={[
                      styles.roleOption,
                      { borderColor: isCurrent ? Colors.gold : 'rgba(255,255,255,0.12)' },
                      isCurrent && styles.roleOptionCurrent,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isCurrent }}
                    accessibilityLabel={`${r.label}: ${r.desc}`}
                  >
                    <View style={[styles.roleDot, { backgroundColor: r.color }]} />
                    <View style={styles.roleTextWrap}>
                      <Text style={[styles.roleLabel, { color: theme.text }]} numberOfLines={1}>
                        {r.label}
                      </Text>
                      <Text style={[styles.roleDesc, { color: theme.textMuted }]} numberOfLines={1}>
                        {r.desc}
                      </Text>
                    </View>
                    {isCurrent && <Text style={styles.roleCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </InfoSection>
          </ScrollReveal>
        )}

        {/* Deactivate / Reactivate */}
        {member.status === 'ACTIVE' && canDeactivate && (
          <ScrollReveal delay={300}>
            <TouchableOpacity
              onPress={() => confirmDeactivate(member.fullName, () => deactivate())}
              disabled={deactivating}
              style={[styles.actionBtn, styles.deactivateBtn, deactivating && styles.btnDisabled]}
              accessibilityRole="button"
              accessibilityLabel={`Deactivate ${member.fullName}`}
            >
              <Text style={styles.deactivateBtnText}>
                {deactivating ? 'Deactivating...' : 'Deactivate member'}
              </Text>
            </TouchableOpacity>
          </ScrollReveal>
        )}
        {member.status === 'DEACTIVATED' && canReactivate && (
          <ScrollReveal delay={300}>
            <TouchableOpacity
              onPress={() => confirmReactivate(member.fullName, () => reactivate())}
              disabled={reactivating}
              style={[styles.actionBtn, styles.reactivateBtn, reactivating && styles.btnDisabled]}
              accessibilityRole="button"
              accessibilityLabel={`Reactivate ${member.fullName}`}
            >
              <Text style={styles.reactivateBtnText}>
                {reactivating ? 'Reactivating...' : 'Reactivate member'}
              </Text>
            </TouchableOpacity>
          </ScrollReveal>
        )}
      </ScrollView>
    </View>
  );
}

function InfoSection({ title, children, theme }: { title: string; children: React.ReactNode; theme: any }) {
  return (
    <View style={[styles.infoSection, { backgroundColor: theme.card }]}>
      <Text style={[styles.sectionTitle, { color: Colors.gold }]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
  theme,
}: {
  label: string;
  value: string;
  valueColor?: string;
  theme: any;
}) {
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
    alignItems: 'center',
    gap: Spacing.sm,
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: Spacing.pagePadding,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { color: Colors.white, fontSize: 32 },
  name: {
    color: Colors.white,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  roleHint: { fontSize: FontSize.caption, marginBottom: Spacing.xs },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 52,
    marginBottom: Spacing.xs,
  },
  roleOptionCurrent: { backgroundColor: 'rgba(244,164,41,0.1)' },
  roleDot: { width: 10, height: 10, borderRadius: 5 },
  roleTextWrap: { flex: 1 },
  roleLabel: { fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  roleDesc: { fontSize: FontSize.caption, marginTop: 1 },
  roleCheck: { color: Colors.gold, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  deactivatedBadge: {
    backgroundColor: 'rgba(220,38,38,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  deactivatedText: { color: Colors.red, fontSize: FontSize.small, fontWeight: FontWeight.medium },
  infoSection: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.widest,
    marginBottom: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  infoLabel: { fontSize: FontSize.small },
  infoValue: { fontSize: FontSize.small, fontWeight: FontWeight.medium, flex: 1, textAlign: 'right' },
  actionBtn: {
    marginHorizontal: Spacing.pagePadding,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  deactivateBtn: {
    borderWidth: 1.5,
    borderColor: Colors.red,
    backgroundColor: 'rgba(220,38,38,0.08)',
  },
  reactivateBtn: {
    borderWidth: 1.5,
    borderColor: Colors.green,
    backgroundColor: 'rgba(45,106,79,0.1)',
  },
  btnDisabled: { opacity: 0.5 },
  deactivateBtnText: { color: Colors.red, fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  reactivateBtnText: { color: Colors.green, fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
});
