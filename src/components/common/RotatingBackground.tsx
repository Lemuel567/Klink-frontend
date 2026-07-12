import React, { useEffect, useRef, useState } from 'react';
import { ImageSourcePropType, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { WorshipPhotoArray } from '../../utils/worshipImages';

const AnimatedImage = Animated.createAnimatedComponent(Image);

interface Props {
  /** Photos to cycle through. Defaults to the full high-res worship set. */
  photos?: ImageSourcePropType[];
  /** How long each photo is shown before crossfading (ms). */
  intervalMs?: number;
  /** Crossfade duration (ms). */
  fadeMs?: number;
  /** Overlay gradient — dark at the bottom so foreground text always reads. */
  overlayColors?: readonly [string, string, ...string[]];
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Full-bleed church-photo background that slowly cycles through the worship
 * photo set with a smooth crossfade. Two stacked image layers: the top layer
 * fades in over the bottom one, then the layers swap roles — no flash, no
 * loading gap (expo-image memory-disk cache keeps decoded photos warm).
 *
 * The crossfade runs on the UI thread (reanimated withTiming); only the
 * layer-swap bookkeeping returns to JS via runOnJS.
 */
export function RotatingBackground({
  photos = WorshipPhotoArray,
  intervalMs = 8000,
  fadeMs = 1500,
  overlayColors = ['rgba(10,5,32,0.2)', 'rgba(10,5,32,0.85)'] as const,
  children,
  style,
}: Props) {
  // baseIndex is always the fully-visible photo; nextIndex fades in above it
  const [baseIndex, setBaseIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1 % Math.max(photos.length, 1));
  const topOpacity = useSharedValue(0);
  const animating = useRef(false);

  // After the fade completes, promote the top photo to the base layer and
  // preload the following one into the (now invisible) top layer.
  const commitSwap = (shownIndex: number) => {
    setBaseIndex(shownIndex);
    setNextIndex((shownIndex + 1) % photos.length);
    topOpacity.value = 0; // instant — the same image is now underneath
    animating.current = false;
  };

  useEffect(() => {
    if (photos.length < 2) return;
    const interval = setInterval(() => {
      if (animating.current) return;
      animating.current = true;
      const shownIndex = nextIndexRef.current;
      topOpacity.value = withTiming(
        1,
        { duration: fadeMs, easing: Easing.inOut(Easing.ease) },
        (finished) => {
          'worklet';
          if (finished) runOnJS(commitSwap)(shownIndex);
        },
      );
    }, intervalMs);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length, intervalMs, fadeMs]);

  // Keep the latest nextIndex readable inside the interval without re-arming it
  const nextIndexRef = useRef(nextIndex);
  nextIndexRef.current = nextIndex;

  const topStyle = useAnimatedStyle(() => ({ opacity: topOpacity.value }));

  return (
    <View style={[styles.container, style]}>
      <Image
        source={photos[baseIndex]}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
      />
      <AnimatedImage
        source={photos[nextIndex]}
        style={[StyleSheet.absoluteFill, topStyle]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
      />
      <LinearGradient colors={overlayColors} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', position: 'relative' },
});
