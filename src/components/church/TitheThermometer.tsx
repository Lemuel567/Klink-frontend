import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Gradients } from '../../theme/colors';
import { FontSize, FontWeight } from '../../theme/typography';
import { BorderRadius, Spacing } from '../../theme/spacing';
import { Duration, SpringConfig } from '../../theme/animations';
import { LinearGradient } from 'expo-linear-gradient';
import { formatAmount } from '../../utils/formatters';

interface Props {
  raised: number;
  target: number;
  currency?: string;
  style?: ViewStyle;
  label?: string;
}

export function TitheThermometer({ raised, target, currency = 'GHS', style, label }: Props) {
  const pct = Math.min(raised / Math.max(target, 1), 1);
  const fillHeight = useSharedValue(0);

  useEffect(() => {
    fillHeight.value = withTiming(pct, { duration: Duration.verySlow });
  }, [pct]);

  const fillStyle = useAnimatedStyle(() => ({
    height: `${fillHeight.value * 100}%`,
  }));

  const milestones = [0.25, 0.5, 0.75, 1.0];

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.row}>
        <View style={styles.cylinder}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.fillWrap, fillStyle]}>
            <LinearGradient
              colors={Gradients.glory}
              start={{ x: 0, y: 1 }}
              end={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          {milestones.map((m) => (
            <View
              key={m}
              style={[styles.milestone, { bottom: `${m * 100}%` }]}
            />
          ))}
        </View>

        <View style={styles.info}>
          <Text style={styles.raised}>
            {currency} {formatAmount(raised)}
          </Text>
          <Text style={styles.target}>
            of {currency} {formatAmount(target)}
          </Text>
          <View style={styles.pctBadge}>
            <Text style={styles.pctText}>{Math.round(pct * 100)}%</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  label: {
    color: Colors.darkText,
    fontSize: FontSize.small,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.md,
  },
  cylinder: {
    width: 28,
    height: 120,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.3)',
    position: 'relative',
  },
  fillWrap: {
    bottom: 0,
    top: undefined,
    borderRadius: 14,
    overflow: 'hidden',
  },
  milestone: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  info: { gap: 4 },
  raised: {
    color: Colors.gold,
    fontSize: FontSize.h4,
    fontWeight: FontWeight.bold,
  },
  target: {
    color: Colors.darkMuted,
    fontSize: FontSize.small,
  },
  pctBadge: {
    backgroundColor: 'rgba(244,164,41,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  pctText: {
    color: Colors.gold,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semiBold,
  },
});
