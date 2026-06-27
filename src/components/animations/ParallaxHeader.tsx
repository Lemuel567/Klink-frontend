import React from 'react';
import { Dimensions, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Gradients } from '../../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  headerHeight?: number;
  headerContent: React.ReactNode;
  gradientColors?: readonly string[];
  children: React.ReactNode;
  style?: ViewStyle;
}

export function ParallaxHeader({
  headerHeight = 300,
  headerContent,
  gradientColors = Gradients.worship,
  children,
  style,
}: Props) {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const bgStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [-headerHeight, 0, headerHeight],
          [-headerHeight * 0.3, 0, headerHeight * 0.3],
          Extrapolation.CLAMP
        ),
      },
      {
        scale: interpolate(scrollY.value, [-headerHeight, 0], [1.3, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  const headerOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, headerHeight * 0.6], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.header, { height: headerHeight }, bgStyle]}>
        <LinearGradient colors={gradientColors as [string, string, ...string[]]} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.headerContent, headerOpacity]}>{headerContent}</Animated.View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: headerHeight }}
        style={StyleSheet.absoluteFill}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 0,
  },
  headerContent: { flex: 1 },
});
