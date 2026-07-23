import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KlinkCard } from '../common/KlinkCard';
import { ScrollReveal } from '../animations/ScrollReveal';
import { ChurchEvent } from '../../api/events';
import { Colors } from '../../theme/colors';
import { FontSize, FontWeight } from '../../theme/typography';
import { BorderRadius, Spacing } from '../../theme/spacing';
import { useTheme } from '../../hooks/useTheme';
import { StaggerDelay } from '../../theme/animations';
import { formatDate } from '../../utils/formatters';

interface Props {
  event: ChurchEvent;
  index?: number;
  onPress?: () => void;
}

export function EventCard({ event, index = 0, onPress }: Props) {
  const { theme } = useTheme();
  const eventDate = new Date(event.eventDate);
  const day = eventDate.getDate().toString().padStart(2, '0');
  const month = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase();
  const isUpcoming = eventDate > new Date();

  return (
    <ScrollReveal replayOnFocus={false} delay={index * StaggerDelay.list}>
      <KlinkCard onPress={onPress} style={styles.card}>
        <View style={styles.row}>
          {/* Date block */}
          <View style={[styles.dateBlock, { backgroundColor: isUpcoming ? 'rgba(244,164,41,0.15)' : theme.skeleton }]}>
            <Text style={[styles.day, { color: isUpcoming ? Colors.gold : theme.textMuted }]}>{day}</Text>
            <Text style={[styles.month, { color: isUpcoming ? Colors.gold : theme.textMuted }]}>{month}</Text>
          </View>

          <View style={styles.info}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {event.title}
            </Text>
            {event.description && (
              <Text style={[styles.desc, { color: theme.textSecondary }]} numberOfLines={2}>
                {event.description}
              </Text>
            )}
            <Text style={[styles.time, { color: theme.textMuted }]}>
              {formatDate(event.eventDate)}
            </Text>
          </View>
        </View>
      </KlinkCard>
    </ScrollReveal>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: Spacing.pagePadding, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dateBlock: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  day: { fontSize: FontSize.h3, fontWeight: FontWeight.bold, lineHeight: FontSize.h3 * 1.1 },
  month: { fontSize: FontSize.micro, fontWeight: FontWeight.semiBold, letterSpacing: 1 },
  info: { flex: 1, gap: 3 },
  title: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  desc: { fontSize: FontSize.small, lineHeight: FontSize.small * 1.5 },
  time: { fontSize: FontSize.caption },
});
