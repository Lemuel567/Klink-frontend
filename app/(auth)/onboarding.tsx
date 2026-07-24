import React, { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { LightBeam } from '../../src/components/animations/LightBeam';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { SpringConfig } from '../../src/theme/animations';
import { useHaptics } from '../../src/hooks/useHaptics';
import { WorshipImages } from '../../src/utils/worshipImages';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Your Church,\nConnected',
    subtitle: 'Stay close to your congregation, no matter where you are.',
    gradient: Gradients.darkWorship,
    accent: Gradients.worship,
  },
  {
    id: '2',
    title: 'Give With\nPurpose',
    subtitle: 'Tithes, offerings, and building fund — all in one place.',
    gradient: ['#0A0F2E', '#1A0A30'] as const,
    accent: Gradients.glory,
  },
  {
    id: '3',
    title: 'Grow\nTogether',
    subtitle: "Track sermons, events, and your spiritual journey as one.",
    gradient: ['#0A1A20', '#0A0F2E'] as const,
    accent: Gradients.heaven,
  },
];

export default function OnboardingScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const haptics = useHaptics();
  const dotX = useSharedValue(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== activeIndex) {
      setActiveIndex(idx);
      dotX.value = withSpring(idx, SpringConfig.tab);
      haptics.light();
    }
  };

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      const nextIndex = activeIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    } else {
      router.replace('/(auth)/login');
    }
  };

  const dotIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dotX.value * 20 }],
  }));

  return (
    <View style={styles.container}>
      {/* Fixed intro background — the "hm" interior photo sits behind every
          slide; a dark scrim keeps the white titles and gold button readable. */}
      <ExpoImage
        source={WorshipImages.interiorWarm1}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <LinearGradient
        colors={['rgba(10,5,32,0.55)', 'rgba(10,5,32,0.72)', 'rgba(10,5,32,0.9)'] as const}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        {SLIDES.map((item) => (
          <View key={item.id} style={styles.slide}>
            {/* Slides sit over the shared "hm" intro photo (rendered on the
                container). Keep only the light beam + colored accent orb so the
                photo shows through instead of an opaque per-slide gradient. */}
            <LightBeam opacity={0.08} />

            {/* Colored gradient orb */}
            <LinearGradient
              colors={item.accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.orb}
            />

            {/* Glassmorphism card at bottom */}
            <View style={styles.cardWrapper}>
              <BlurView intensity={50} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.xxl }]} />
              <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          <Animated.View style={[styles.activeDot, dotIndicatorStyle]} />
          {SLIDES.map((_, i) => (
            <View key={i} style={styles.dot} />
          ))}
        </View>

        <KlinkButton
          label={activeIndex === SLIDES.length - 1 ? 'Get started' : 'Next'}
          onPress={handleNext}
          style={styles.nextBtn}
        />

        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          style={styles.skipBtn}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: { width, height, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 220 },
  orb: {
    position: 'absolute',
    top: '15%',
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.3,
  },
  cardWrapper: {
    position: 'absolute',
    bottom: 180,
    left: Spacing.pagePadding,
    right: Spacing.pagePadding,
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  glassOverlay: {
    borderRadius: BorderRadius.xxl,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  title: {
    color: Colors.white,
    fontSize: FontSize.h1,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
    lineHeight: FontSize.h1 * 1.2,
  },
  subtitle: {
    color: Colors.darkMuted,
    fontSize: FontSize.body,
    lineHeight: FontSize.body * 1.7,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.pagePadding,
    paddingBottom: 48,
    gap: Spacing.md,
    alignItems: 'center',
  },
  dots: { flexDirection: 'row', gap: 6, position: 'relative', alignItems: 'center', height: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  activeDot: {
    position: 'absolute',
    left: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
  },
  nextBtn: { width: '100%' },
  skipBtn: { paddingVertical: 8 },
  skipText: { color: Colors.darkMuted, fontSize: FontSize.small, fontWeight: FontWeight.medium },
});
