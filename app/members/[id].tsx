import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KlinkAvatar, RoleBadge } from '../../src/components/common/KlinkAvatar';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { MemberCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { membersApi } from '../../src/api/members';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { formatDate, formatPhoneDisplay, formatRole } from '../../src/utils/formatters';

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const { data: member, isLoading } = useQuery({
    queryKey: ['member', id],
    queryFn: () => membersApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <MemberCardSkeleton />
      </View>
    );
  }

  if (!member) return null;

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

        <ScrollReveal delay={100}>
          <InfoSection title="Church profile" theme={theme}>
            <InfoRow label="Role" value={formatRole(member.role)} theme={theme} />
            <InfoRow label="Category" value={member.category} theme={theme} />
            <InfoRow label="Member since" value={formatDate(member.createdAt)} theme={theme} />
            {member.dateOfBirth && (
              <InfoRow label="Date of birth" value={formatDate(member.dateOfBirth)} theme={theme} />
            )}
          </InfoSection>
        </ScrollReveal>

        <ScrollReveal delay={200}>
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
        </ScrollReveal>
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
});
