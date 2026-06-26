import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TitheThermometer } from '../../src/components/church/TitheThermometer';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { SermonCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { projectsApi } from '../../src/api/projects';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { formatCurrency, formatDate } from '../../src/utils/formatters';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

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
      </ScrollView>
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
});
