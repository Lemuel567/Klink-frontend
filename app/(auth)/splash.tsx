import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { LightBeam } from '../../src/components/animations/LightBeam';
import { FloatingElement } from '../../src/components/animations/FloatingElement';
import { CrossWithRays } from '../../src/components/worship';
import { WatermarkBackground } from '../../src/components/common/WatermarkBackground';
import { TypewriterText } from '../../src/components/animations/TypewriterText';
import { ScreenPhotos } from '../../src/utils/worshipImages';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { Duration, EasingPresets, SpringConfig } from '../../src/theme/animations';
import { useAuthStore } from '../../src/store/authStore';
import { soundManager } from '../../src/utils/soundManager';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const { isAuthenticated, isInitialized } = useAuthStore();

  // Gradient morph — cycles through worship colors
  const gradientProgress = useSharedValue(0);

  // Logo elements
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  // Text reveals
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);
  const taglineOpacity = useSharedValue(0);

  // Particles
  const particleOpacity = useSharedValue(0);

  function navigate() {
    if (isAuthenticated) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(auth)/onboarding');
    }
  }

  useEffect(() => {
    // Play chime as soon as splash appears — runs in parallel with logo animation
    soundManager.playAppOpen().catch(() => {});
  }, []);

  useEffect(() => {
    // Start gradient morph loop
    gradientProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: Duration.gradientMorph }),
        withTiming(2, { duration: Duration.gradientMorph }),
        withTiming(0, { duration: Duration.gradientMorph }),
      ),
      -1,
    );

    // Particles rise
    particleOpacity.value = withTiming(1, { duration: 500 });

    // Logo burst in at 400ms
    logoScale.value = withDelay(400, withSpring(1, SpringConfig.celebrate));
    logoOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
    glowOpacity.value = withDelay(700, withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500, easing: EasingPresets.float }),
        withTiming(0.4, { duration: 1500, easing: EasingPresets.float }),
      ),
      -1,
      true,
    ));

    // Title
    titleOpacity.value = withDelay(900, withTiming(1, { duration: Duration.medium }));
    titleY.value = withDelay(900, withTiming(0, { duration: Duration.medium, easing: EasingPresets.enter }));

    // Tagline container fades in just before the typewriter starts
    taglineOpacity.value = withDelay(1100, withTiming(1, { duration: 200 }));

    // Navigate at 3s
    const timer = setTimeout(() => {
      runOnJS(navigate)();
    }, 3000);
    return () => clearTimeout(timer);
  }, [isInitialized]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <WatermarkBackground
      imageSource={ScreenPhotos.splash}
      overlayOpacity={0.5}
      style={styles.container}
    >
      {/* Purple aurora layer over the worship photo */}
      <View style={[StyleSheet.absoluteFill, styles.aurora]} />

      {/* Light beams from top */}
      <LightBeam opacity={0.15} />

      {/* Particle system */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: particleOpacity }]}>
        <ParticleSystem />
      </Animated.View>

      {/* Center logo area */}
      <View style={styles.center}>
        {/* Cross with light rays, fading in with the glow, behind the logo */}
        <Animated.View style={[styles.crossArt, glowStyle]} pointerEvents="none">
          <CrossWithRays width={300} height={300} />
        </Animated.View>

        {/* Gold glow behind logo */}
        <Animated.View style={[styles.glow, glowStyle]} />

        {/* Logo */}
        <FloatingElement amplitude={6} duration={3000}>
          <Animated.View style={[styles.logoContainer, logoStyle]}>
            <View style={styles.logoCircle}>
              <LinearGradient
                colors={Gradients.glory}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <Text style={styles.logoText}>K</Text>
              </LinearGradient>
            </View>
          </Animated.View>
        </FloatingElement>

        {/* Church name */}
        <Animated.Text style={[styles.appName, titleStyle]}>Klink</Animated.Text>

        {/* Tagline */}
        {/* The tagline writes itself as the logo settles */}
        <Animated.View style={taglineStyle}>
          <TypewriterText
            text="Your Church, Connected"
            style={styles.tagline}
            startDelayMs={1300}
            charDelayMs={55}
            cursor
          />
        </Animated.View>
      </View>
    </WatermarkBackground>
  );
}

// Simple cross-particle system using View-based dots
function ParticleSystem() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * width,
    delay: Math.random() * 2000,
    size: 2 + Math.random() * 4,
    duration: 4000 + Math.random() * 4000,
    opacity: 0.3 + Math.random() * 0.5,
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      {particles.map((p) => (
        <FloatingParticle key={p.id} {...p} />
      ))}
    </View>
  );
}

function FloatingParticle({
  x,
  delay,
  size,
  duration,
  opacity,
}: {
  x: number;
  delay: number;
  size: number;
  duration: number;
  opacity: number;
}) {
  const translateY = useSharedValue(height * 0.2);
  const particleOpacity = useSharedValue(0);

  useEffect(() => {
    const animate = () => {
      translateY.value = height * 0.2;
      particleOpacity.value = 0;
      translateY.value = withDelay(delay, withTiming(-height * 0.1, { duration }));
      particleOpacity.value = withDelay(delay, withSequence(
        withTiming(opacity, { duration: 500 }),
        withTiming(0, { duration: duration - 500 }),
      ));
    };
    animate();
    const interval = setInterval(animate, duration + delay);
    return () => clearInterval(interval);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: particleOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          bottom: 0,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: Colors.gold,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  aurora: {
    backgroundColor: 'rgba(45,27,105,0.4)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  crossArt: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(244,164,41,0.25)',
  },
  logoContainer: { zIndex: 10 },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 20,
  },
  logoGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: Colors.purple,
    fontSize: 52,
    fontWeight: FontWeight.bold,
  },
  appName: {
    color: Colors.white,
    fontSize: 48,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tightest,
  },
  tagline: {
    color: Colors.gold,
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    letterSpacing: LetterSpacing.wider,
    textTransform: 'uppercase',
  },
});
