import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { KlinkCard } from '../common/KlinkCard';
import { TitheThermometer } from '../church/TitheThermometer';
import { ScrollReveal } from '../animations/ScrollReveal';
import { Project } from '../../api/projects';
import { Colors, Gradients } from '../../theme/colors';
import { FontSize, FontWeight } from '../../theme/typography';
import { BorderRadius, Spacing } from '../../theme/spacing';
import { useTheme } from '../../hooks/useTheme';
import { StaggerDelay } from '../../theme/animations';

interface Props {
  project: Project;
  index?: number;
  onPress?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  PROPOSED: Colors.darkMuted,
  APPROVED: Colors.blue,
  FUNDRAISING: Colors.gold,
  IN_PROGRESS: Colors.green,
  ON_HOLD: Colors.roseGold,
  COMPLETED: Colors.green,
  CANCELLED: Colors.red,
};

export function ProjectCard({ project, index = 0, onPress }: Props) {
  const { theme } = useTheme();
  const statusColor = STATUS_COLORS[project.status] ?? Colors.darkMuted;

  return (
    <ScrollReveal replayOnFocus={false} delay={index * StaggerDelay.list}>
      <KlinkCard onPress={onPress} padded={false} style={styles.card}>
        {/* Header gradient */}
        <LinearGradient
          colors={Gradients.darkWorship}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}30` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {project.status.replace('_', ' ')}
            </Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>{project.title}</Text>
          {project.description && (
            <Text style={styles.desc} numberOfLines={2}>{project.description}</Text>
          )}
        </LinearGradient>

        <View style={styles.body}>
          <TitheThermometer
            raised={project.amountRaised}
            target={project.targetAmount}
            currency={project.currency}
            label="Fundraising Progress"
          />
        </View>
      </KlinkCard>
    </ScrollReveal>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: Spacing.pagePadding, marginBottom: Spacing.sm, overflow: 'hidden' },
  header: { padding: Spacing.md, gap: 6 },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: FontSize.caption, fontWeight: FontWeight.semiBold },
  title: { color: Colors.white, fontSize: FontSize.h4, fontWeight: FontWeight.bold },
  desc: { color: 'rgba(245,245,245,0.7)', fontSize: FontSize.small, lineHeight: FontSize.small * 1.5 },
  body: { padding: Spacing.md },
});
