import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KlinkCard } from '../common/KlinkCard';
import { KlinkAvatar, RoleBadge } from '../common/KlinkAvatar';
import { ScrollReveal } from '../animations/ScrollReveal';
import { Member } from '../../api/members';
import { Colors } from '../../theme/colors';
import { FontSize, FontWeight } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { useTheme } from '../../hooks/useTheme';
import { formatRelativeTime } from '../../utils/formatters';
import { StaggerDelay } from '../../theme/animations';

interface Props {
  member: Member;
  index?: number;
  onPress?: () => void;
}

export function MemberCard({ member, index = 0, onPress }: Props) {
  const { theme } = useTheme();

  return (
    <ScrollReveal delay={index * StaggerDelay.list}>
      <KlinkCard onPress={onPress} style={styles.card}>
        <View style={styles.row}>
          <KlinkAvatar name={member.fullName} photoUrl={member.photoUrl} size={52} />
          <View style={styles.info}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {member.fullName}
            </Text>
            <View style={styles.meta}>
              <RoleBadge role={member.role} />
              {member.status === 'DEACTIVATED' && (
                <View style={styles.deactivatedBadge}>
                  <Text style={styles.deactivatedText}>Inactive</Text>
                </View>
              )}
            </View>
            <Text style={[styles.joined, { color: theme.textMuted }]}>
              Joined {formatRelativeTime(member.createdAt)}
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
  info: { flex: 1, gap: 4 },
  name: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  joined: { fontSize: FontSize.caption },
  deactivatedBadge: {
    backgroundColor: 'rgba(220,38,38,0.15)',
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  deactivatedText: { color: Colors.red, fontSize: FontSize.caption, fontWeight: FontWeight.medium },
});
