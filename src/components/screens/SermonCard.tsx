import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { KlinkCard } from '../common/KlinkCard';
import { ScrollReveal } from '../animations/ScrollReveal';
import { Sermon } from '../../api/sermons';
import { Colors } from '../../theme/colors';
import { FontSize, FontWeight } from '../../theme/typography';
import { BorderRadius, Spacing } from '../../theme/spacing';
import { useTheme } from '../../hooks/useTheme';
import { formatDate } from '../../utils/formatters';
import { StaggerDelay } from '../../theme/animations';

interface Props {
  sermon: Sermon;
  index?: number;
  onPress?: () => void;
  featured?: boolean;
}

export function SermonCard({ sermon, index = 0, onPress, featured = false }: Props) {
  const { theme } = useTheme();
  const height = featured ? 220 : 140;

  return (
    <ScrollReveal replayOnFocus={false} delay={index * StaggerDelay.list}>
      <KlinkCard onPress={onPress} padded={false} style={[styles.card, featured && styles.featured]}>
        {/* Cover — the tt worship photo under a purple stained-glass tint */}
        <View style={[styles.artwork, { height }]}>
          <Image
            source={require('../../../assets/images/tt.jpg')}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={250}
          />
          {/* Stained glass overlay effect */}
          <View style={styles.stainedGlass} />

          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)']}
            style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', padding: Spacing.md }]}
          >
            <Text style={styles.sermonTitle} numberOfLines={2}>{sermon.title}</Text>
            <Text style={styles.preacher}>{sermon.preacher}</Text>
          </LinearGradient>
        </View>

        {/* Meta below artwork */}
        <View style={styles.meta}>
          <Text style={[styles.date, { color: theme.textMuted }]}>{formatDate(sermon.sermonDate)}</Text>
          {sermon.scripture && (
            <Text style={styles.scripture} numberOfLines={1}>{sermon.scripture}</Text>
          )}
        </View>
      </KlinkCard>
    </ScrollReveal>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: Spacing.pagePadding, marginBottom: Spacing.sm, overflow: 'hidden' },
  featured: { marginHorizontal: 0 },
  artwork: { width: '100%', justifyContent: 'flex-end' },
  stainedGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(74,37,128,0.15)',
  },
  sermonTitle: {
    color: Colors.white,
    fontSize: FontSize.h4,
    fontWeight: FontWeight.bold,
    lineHeight: FontSize.h4 * 1.3,
  },
  preacher: {
    color: Colors.gold,
    fontSize: FontSize.small,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
  meta: {
    padding: Spacing.md,
    gap: 4,
  },
  date: { fontSize: FontSize.caption },
  scripture: {
    color: Colors.gold,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
  },
});
