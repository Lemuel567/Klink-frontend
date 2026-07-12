// MUST come from reanimated, not react-native — Reanimated 4 requires worklet
// easings; passing RN's Easing throws "The easing function is not a worklet".
import { Easing } from 'react-native-reanimated';

export const SpringConfig = {
  // Standard spring for most interactions
  default: { damping: 15, stiffness: 150, mass: 1 },
  // Gentle float for ambient elements
  gentle: { damping: 20, stiffness: 80, mass: 1 },
  // Snappy response for button feedback
  snappy: { damping: 8, stiffness: 200, mass: 0.8 },
  // Bouncy card interactions
  bouncy: { damping: 10, stiffness: 120, mass: 1 },
  // Overshoot for celebrations
  celebrate: { damping: 6, stiffness: 180, mass: 0.9 },
  // Tight for tab switches
  tab: { damping: 18, stiffness: 200, mass: 0.9 },
} as const;

export const Duration = {
  instant: 0,
  fast: 150,
  normal: 250,
  medium: 300,
  slow: 400,
  verySlow: 600,
  // Page-level transitions
  page: 350,
  // Hero animations
  hero: 500,
  // Looping ambient
  ambient: 3000,
  // Ken Burns pan
  pan: 8000,
  // Ken Burns zoom
  zoom: 10000,
  // Gradient morph
  gradientMorph: 4000,
  // Skeleton shimmer
  shimmer: 1500,
} as const;

export const EasingPresets = {
  // Enter: ease out — element decelerates into place
  enter: Easing.out(Easing.cubic),
  // Exit: ease in — element accelerates away
  exit: Easing.in(Easing.ease),
  // Back: overshoot on entry
  back: Easing.out(Easing.back(1.5)),
  // Smooth sine for floating / ambient
  float: Easing.inOut(Easing.sin),
  // Standard in-out
  smooth: Easing.inOut(Easing.ease),
} as const;

export const StaggerDelay = {
  list: 80,
  grid: 60,
  hero: 100,
  fast: 40,
} as const;

export const AnimationPresets = {
  // Scroll-reveal entry
  scrollReveal: {
    from: { opacity: 0, translateY: 30 },
    duration: Duration.medium,
    easing: EasingPresets.enter,
  },
  // Card press
  cardPress: {
    scale: 0.97,
    shadowReduction: 0.4,
    spring: SpringConfig.snappy,
  },
  // Button press 3D push
  buttonPress: {
    translateY: 3,
    scale: 0.97,
    spring: SpringConfig.snappy,
  },
  // Tab switch
  tabSwitch: {
    scale: 1.2,
    spring: SpringConfig.tab,
    duration: Duration.fast,
  },
  // Skeleton shimmer
  shimmer: {
    duration: Duration.shimmer,
    from: -1,
    to: 1,
  },
} as const;
