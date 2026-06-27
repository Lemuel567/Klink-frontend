import React, { useState, useCallback } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { authApi } from '../../src/api/auth';
import { useAuthStore } from '../../src/store/authStore';
import { useHaptics } from '../../src/hooks/useHaptics';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';

export default function VerifyScreen() {
  // Email is passed as a route param from register screen
  // (user is not logged in yet, so we can't read it from the auth store)
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = emailParam ?? '';

  const { login } = useAuthStore();
  const haptics = useHaptics();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleVerify = useCallback(async () => {
    if (loading || code.length < 6) return;
    setError('');
    setLoading(true);
    try {
      // verifyEmail returns full AuthResponse — tokens are issued here
      const authResponse = await authApi.verifyEmail({ email, code: code.trim() });
      await login(authResponse);
      haptics.success();
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(e?.friendlyMessage ?? 'Invalid code. Please try again.');
      haptics.error();
    } finally {
      setLoading(false);
    }
  }, [code, loading, email, login]);

  const handleResend = useCallback(async () => {
    if (resending || !email) return;
    setResending(true);
    try {
      await authApi.resendVerification(email);
      setResent(true);
      haptics.success();
      setTimeout(() => setResent(false), 5000);
    } catch {
      haptics.error();
    } finally {
      setResending(false);
    }
  }, [resending, email]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={Gradients.darkWorship} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inner}>
          <ScrollReveal delay={0}>
            <Text style={styles.heading}>Verify your email</Text>
            <Text style={styles.sub}>
              We sent a 6-digit code to {email || 'your email'}. Enter it below.
            </Text>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <View style={styles.card}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />

              <KlinkInput
                label="6-digit code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={handleVerify}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}
              {resent ? <Text style={styles.success}>Code sent! Check your inbox.</Text> : null}

              <KlinkButton label="Verify email" onPress={handleVerify} loading={loading} />
              <KlinkButton
                label={resending ? 'Sending...' : 'Resend code'}
                onPress={handleResend}
                variant="ghost"
                loading={resending}
              />
            </View>
          </ScrollReveal>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.pagePadding,
    gap: Spacing.xl,
  },
  heading: {
    color: Colors.white,
    fontSize: FontSize.h1,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  sub: { color: Colors.darkMuted, fontSize: FontSize.body, lineHeight: FontSize.body * 1.6 },
  card: {
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  glassOverlay: {
    borderRadius: BorderRadius.xxl,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  error: { color: Colors.red, fontSize: FontSize.small, textAlign: 'center' },
  success: { color: Colors.green, fontSize: FontSize.small, textAlign: 'center' },
});
