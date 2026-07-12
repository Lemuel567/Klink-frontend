import React, { useState, useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { LightBeam } from '../../src/components/animations/LightBeam';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { authApi } from '../../src/api/auth';
import { WatermarkBackground } from '../../src/components/common/WatermarkBackground';
import { ScreenPhotos } from '../../src/utils/worshipImages';
import { useHaptics } from '../../src/hooks/useHaptics';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';

type Mode = 'join' | 'create';

export default function RegisterScreen() {
  // ?mode=create preselects church registration (linked from the login screen)
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'create' ? 'create' : 'join');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [churchCode, setChurchCode] = useState('');
  const [churchName, setChurchName] = useState('');
  const [location, setLocation] = useState('');
  const [denomination, setDenomination] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const haptics = useHaptics();

  const handleRegister = useCallback(async () => {
    if (loading) return;
    setError('');

    if (!fullName.trim()) {
      setError('Full name is required.');
      haptics.error();
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError('Please provide an email address or phone number.');
      haptics.error();
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      haptics.error();
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      haptics.error();
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      haptics.error();
      return;
    }
    if (mode === 'join' && !churchCode.trim()) {
      setError('Church code is required to join.');
      haptics.error();
      return;
    }
    if (mode === 'create' && !churchName.trim()) {
      setError('Church name is required.');
      haptics.error();
      return;
    }

    setLoading(true);
    try {
      if (mode === 'join') {
        await authApi.register({
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          phoneNumber: phone.trim() || undefined,
          password,
          churchCode: churchCode.trim(),
        });
      } else {
        if (!denomination.trim()) {
          setError('Denomination is required.');
          haptics.error();
          setLoading(false);
          return;
        }
        // registerChurch expects pastorEmail/pastorPassword (not email/password)
        await authApi.registerChurch({
          churchName: churchName.trim(),
          location: location.trim(),
          denomination: denomination.trim(),
          pastorName: fullName.trim(),
          pastorEmail: email.trim(),
          pastorPassword: password,
        });
      }
      // Both register endpoints return { message } — tokens come from verify-email
      haptics.success();
      // Pass email so verify screen can display and use it
      router.replace(`/(auth)/verify?email=${encodeURIComponent(email.trim())}`);
    } catch (e: any) {
      setError(e?.friendlyMessage ?? 'Registration failed. Please try again.');
      haptics.error();
    } finally {
      setLoading(false);
    }
  }, [mode, fullName, email, phone, password, confirmPassword, churchCode, churchName, location, denomination, loading]);

  return (
    <WatermarkBackground imageSource={ScreenPhotos.register} overlayOpacity={0.64} style={styles.container}>
      <LightBeam opacity={0.08} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Mode toggle */}
          <ScrollReveal delay={0}>
            <Text style={styles.heading}>Join Klink</Text>
            <View style={styles.toggle}>
              <TouchableOpacity
                onPress={() => { haptics.light(); setMode('join'); }}
                style={[styles.toggleBtn, mode === 'join' && styles.toggleActive]}
                accessibilityRole="button"
              >
                <Text style={[styles.toggleText, mode === 'join' && styles.toggleTextActive]}>
                  Join a Church
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { haptics.light(); setMode('create'); }}
                style={[styles.toggleBtn, mode === 'create' && styles.toggleActive]}
                accessibilityRole="button"
              >
                <Text style={[styles.toggleText, mode === 'create' && styles.toggleTextActive]}>
                  Register Church
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollReveal>

          {/* Glass card */}
          <ScrollReveal delay={200}>
            <View style={styles.card}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />

              <KlinkInput label="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" />
              <KlinkInput
                label="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <KlinkInput
                label="Phone number (+233...)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              {mode === 'join' ? (
                <KlinkInput
                  label="Church code"
                  value={churchCode}
                  onChangeText={setChurchCode}
                  autoCapitalize="characters"
                />
              ) : (
                <>
                  <KlinkInput label="Church name" value={churchName} onChangeText={setChurchName} />
                  <KlinkInput label="Location" value={location} onChangeText={setLocation} />
                  <KlinkInput label="Denomination (e.g. Presbyterian)" value={denomination} onChangeText={setDenomination} />
                </>
              )}

              <KlinkInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                rightIcon={<Text style={styles.showHide}>{showPassword ? 'Hide' : 'Show'}</Text>}
                onRightIconPress={() => setShowPassword((v) => !v)}
              />
              <KlinkInput
                label="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <KlinkButton
                label={mode === 'join' ? 'Join church' : 'Register church'}
                onPress={handleRegister}
                loading={loading}
              />

              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backBtn}
                accessibilityRole="link"
              >
                <Text style={styles.backText}>Already have an account? Sign in</Text>
              </TouchableOpacity>
            </View>
          </ScrollReveal>
        </ScrollView>
      </KeyboardAvoidingView>
    </WatermarkBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.pagePadding,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  heading: {
    color: Colors.white,
    fontSize: FontSize.h1,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
    marginBottom: Spacing.md,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.full,
    padding: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: BorderRadius.full, alignItems: 'center' },
  toggleActive: { backgroundColor: Colors.gold },
  toggleText: { color: Colors.darkMuted, fontWeight: FontWeight.medium, fontSize: FontSize.small },
  toggleTextActive: { color: Colors.purple, fontWeight: FontWeight.semiBold },
  card: { borderRadius: BorderRadius.xxl, overflow: 'hidden', padding: Spacing.lg, gap: Spacing.sm },
  glassOverlay: {
    borderRadius: BorderRadius.xxl,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  showHide: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.medium },
  errorText: { color: Colors.red, fontSize: FontSize.small, textAlign: 'center' },
  backBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  backText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.medium },
});
