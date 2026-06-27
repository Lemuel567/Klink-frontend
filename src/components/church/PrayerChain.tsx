import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';
import { FontSize } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';

interface PrayerNode {
  id: string;
  name: string;
  initials: string;
  delay: number;
}

interface Props {
  members?: { id: string; name: string }[];
  style?: ViewStyle;
}

function NodeOrb({ node }: { node: PrayerNode }) {
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withDelay(
      node.delay,
      withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
  }, []);

  const orbStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(glow.value, [0, 1], [0.2, 0.8]),
    shadowRadius: interpolate(glow.value, [0, 1], [4, 12]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.05]) }],
  }));

  return (
    <Animated.View style={[styles.orb, orbStyle]}>
      <Text style={styles.orbInitials}>{node.initials}</Text>
    </Animated.View>
  );
}

const DEFAULT_MEMBERS = [
  { id: '1', name: 'You' },
  { id: '2', name: 'Church' },
  { id: '3', name: 'Family' },
  { id: '4', name: 'Community' },
];

export function PrayerChain({ members = DEFAULT_MEMBERS, style }: Props) {
  const nodes: PrayerNode[] = members.slice(0, 6).map((m, i) => ({
    id: m.id,
    name: m.name,
    initials: m.name.slice(0, 2).toUpperCase(),
    delay: i * 300,
  }));

  return (
    <View style={[styles.container, style]}>
      {nodes.map((node, i) => (
        <View key={node.id} style={styles.nodeRow}>
          <NodeOrb node={node} />
          <Text style={styles.nodeName}>{node.name}</Text>
          {i < nodes.length - 1 && <View style={styles.connector} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  nodeRow: { alignItems: 'center', gap: 4 },
  orb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(45,27,105,0.8)',
    borderWidth: 1.5,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  orbInitials: { color: Colors.gold, fontSize: FontSize.small, fontWeight: '700' },
  nodeName: { color: Colors.darkMuted, fontSize: FontSize.micro },
  connector: { width: 16, height: 1.5, backgroundColor: `${Colors.gold}40`, marginHorizontal: 2 },
});
