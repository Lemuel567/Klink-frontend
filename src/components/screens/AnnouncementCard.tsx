import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { KlinkCard } from '../common/KlinkCard';
import { ScrollReveal } from '../animations/ScrollReveal';
import { getWorshipPhoto } from '../../utils/worshipImages';
import { Announcement, targetTypeLabel, targetTypeColor } from '../../api/announcements';
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

  const isTargeted = announcement.isTargeted && announcement.targetType !== 'ALL';
  const badgeColor = targetTypeColor(announcement.targetType);
  const badgeLabel = targetTypeLabel(announcement.targetType);

  return (
    <ScrollReveal replayOnFocus={false} delay={index * StaggerDelay.list}>
      <KlinkCard onPress={onPress} style={styles.card}>
        {/* Alternating worship photo — subtle right-edge accent, faded into the card */}
        <ExpoImage
          source={getWorshipPhoto(index)}
          style={styles.photoAccent}
          contentFit="cover"
          transition={300}
          cachePolicy="memory-disk"
        />
        <LinearGradient
          colors={[theme.card, `${theme.card}CC`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.photoMask}
          pointerEvents="none"
        />
        <View style={[styles.accent, { backgroundColor: isTargeted ? badgeColor : Colors.gold }]} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text, flex: 1 }]} numberOfLines={2}>
              {announcement.title}
            </Text>
            {isTargeted && (
              <View style={[styles.badge, { backgroundColor: `${badgeColor}22`, borderColor: `${badgeColor}55` }]}>
                <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.preview, { color: theme.textSecondary }]} numberOfLines={3}>
            {announcement.body}
          </Text>
          <View style={styles.footer}>
            <Text style={[styles.time, { color: theme.textMuted }]}>
              {formatRelativeTime(announcement.createdAt)}
            </Text>
            {announcement.recipientCount > 0 && (
              <Text style={[styles.recipients, { color: theme.textMuted }]}>
                {announcement.recipientCount} recipient{announcement.recipientCount !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
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
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  photoAccent: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '55%',
    opacity: 0.22,
  },
  photoMask: { ...StyleSheet.absoluteFillObject },
  body: { flex: 1, padding: Spacing.md, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  title: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    borderWidth: 1,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  badgeText: { fontSize: 10, fontWeight: FontWeight.semiBold },
  preview: { fontSize: FontSize.small, lineHeight: FontSize.small * 1.6 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  time: { fontSize: FontSize.caption },
  recipients: { fontSize: FontSize.caption },
});
