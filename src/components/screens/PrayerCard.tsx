import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { KlinkCard } from '../common/KlinkCard';
import { ScrollReveal } from '../animations/ScrollReveal';
import { PrayerRequest } from '../../api/prayerRequests';
import { Colors } from '../../theme/colors';
import { FontSize, FontWeight } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { formatRelativeTime } from '../../utils/formatters';
import { StaggerDelay } from '../../theme/animations';

interface Props {
  prayer: PrayerRequest;
  index?: number;
  canRespond: boolean; // Pastor / Elder
  canDelete: boolean;  // author or Pastor / Elder
  onRespond?: () => void;
  onDelete?: () => void;
}

export function PrayerCard({ prayer, index = 0, canRespond, canDelete, onRespond, onDelete }: Props) {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const [expanded, setExpanded] = useState(false);

  const isPrivate = prayer.visibility === 'PRIVATE';
  const isAnswered = prayer.status === 'ANSWERED';
  const accentColor = isPrivate ? Colors.purpleLight : Colors.gold;

  return (
    <ScrollReveal delay={index * StaggerDelay.list}>
      <KlinkCard
        onPress={() => { haptics.light(); setExpanded((e) => !e); }}
        style={styles.card}
      >
        <View style={[styles.accent, { backgroundColor: accentColor }]} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text, flex: 1 }]} numberOfLines={expanded ? undefined : 2}>
              {prayer.title}
            </Text>
            <View style={[styles.badge, { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}55` }]}>
              <Text style={[styles.badgeText, { color: accentColor }]}>
                {isPrivate ? 'PRIVATE' : 'PUBLIC'}
              </Text>
            </View>
          </View>

          <Text
            style={[styles.preview, { color: theme.textSecondary }]}
            numberOfLines={expanded ? undefined : 3}
          >
            {prayer.content}
          </Text>

          {/* Leader response — shown once the request has been answered */}
          {isAnswered && prayer.leaderResponse ? (
            <View style={[styles.responseBox, { borderColor: `${Colors.green}55`, backgroundColor: `${Colors.green}12` }]}>
              <Text style={[styles.responseLabel, { color: Colors.green }]}>🙏 Answered</Text>
              <Text
                style={[styles.responseText, { color: theme.textSecondary }]}
                numberOfLines={expanded ? undefined : 2}
              >
                {prayer.leaderResponse}
              </Text>
            </View>
          ) : null}

          <View style={styles.footer}>
            <Text style={[styles.time, { color: theme.textMuted }]}>
              {prayer.memberName ?? 'A member'} · {formatRelativeTime(prayer.createdAt)}
            </Text>
            {!isAnswered && (
              <Text style={[styles.openBadge, { color: Colors.gold }]}>Open</Text>
            )}
          </View>

          {/* Actions — revealed when expanded */}
          {expanded && (canRespond || canDelete) && (
            <View style={styles.actions}>
              {canRespond && !isAnswered && (
                <TouchableOpacity
                  onPress={() => { haptics.medium(); onRespond?.(); }}
                  style={[styles.actionBtn, { borderColor: Colors.gold }]}
                  accessibilityRole="button"
                  accessibilityLabel="Respond to this prayer request"
                >
                  <Text style={[styles.actionText, { color: Colors.gold }]}>Respond</Text>
                </TouchableOpacity>
              )}
              {canDelete && (
                <TouchableOpacity
                  onPress={() => { haptics.heavy(); onDelete?.(); }}
                  style={[styles.actionBtn, { borderColor: Colors.red }]}
                  accessibilityRole="button"
                  accessibilityLabel="Delete this prayer request"
                >
                  <Text style={[styles.actionText, { color: Colors.red }]}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
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
  body: { flex: 1, padding: Spacing.md, gap: 6 },
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
  responseBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.sm,
    gap: 2,
    marginTop: 2,
  },
  responseLabel: { fontSize: FontSize.caption, fontWeight: FontWeight.bold },
  responseText: { fontSize: FontSize.small, lineHeight: FontSize.small * 1.5 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  time: { fontSize: FontSize.caption },
  openBadge: { fontSize: FontSize.caption, fontWeight: FontWeight.semiBold },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  actionBtn: {
    borderWidth: 1.5,
    borderRadius: 99,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  actionText: { fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
});
