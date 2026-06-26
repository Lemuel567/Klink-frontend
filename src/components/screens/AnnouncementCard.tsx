import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KlinkCard } from '../common/KlinkCard';
import { ScrollReveal } from '../animations/ScrollReveal';
import { Announcement } from '../../api/announcements';
import { Colors } from '../../theme/colors';
import { FontSize, FontWeight } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { useTheme } from '../../hooks/useTheme';
import { formatRelativeTime } from '../../utils/formatters';
import { StaggerDelay } from '../../theme/animations';

interface Props {
  announcement: Announcement;
  index?: number;
  onPress?: () => void;
}

export function AnnouncementCard({ announcement, index = 0, onPress }: Props) {
  const { theme } = useTheme();

  return (
    <ScrollReveal delay={index * StaggerDelay.list}>
      <KlinkCard onPress={onPress} style={styles.card}>
        <View style={styles.accent} />
        <View style={styles.body}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {announcement.title}
          </Text>
          <Text style={[styles.preview, { color: theme.textSecondary }]} numberOfLines={3}>
            {announcement.body}
          </Text>
          <Text style={[styles.time, { color: theme.textMuted }]}>
            {formatRelativeTime(announcement.createdAt)}
          </Text>
        </View>
      </KlinkCard>
    </ScrollReveal>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.pagePadding,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    padding: 0,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
    backgroundColor: Colors.gold,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  body: { flex: 1, padding: Spacing.md, gap: 4 },
  title: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  preview: { fontSize: FontSize.small, lineHeight: FontSize.small * 1.6 },
  time: { fontSize: FontSize.caption, marginTop: 4 },
});
