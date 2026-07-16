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
import { FloatingElement } from '../../src/components/animations/FloatingElement';
import { LightBeam } from '../../src/components/animations/LightBeam';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { RotatingBackground } from '../../src/components/common/RotatingBackground';
import { authApi } from '../../src/api/auth';
import { useAuthStore } from '../../src/store/authStore';
import { useHaptics } from '../../src/hooks/useHaptics';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';

// Same visual identity as the login screen: rotating worship photos, light
// beam, floating gold "K" logo, translucent glass card. The screen verifies
// EITHER an email (?email=) or a phone number (?phone=) — phone-only members
// get their 6-digit code by SMS and must never be sent down the email path.
export default function VerifyScreen() {
  const { email: emailParam, phone: phoneParam } = useLocalSearchParams<{
    email?: string;
    phone?: string;
  }>();
  const email = emailParam ?? '';
  // Defensive E.164 repair: if the "+" was swallowed by URL decoding (it becomes
  // a space) or dropped entirely, restore it — verify-phone must receive the
  // exact identifier the member registered with or the code never matches.
  const rawPhone = (phoneParam ?? '').trim();
  const phone = rawPhone && !rawPhone.startsWith('+') ? `+${rawPhone}` : rawPhone;
  const isPhoneFlow = !email && !!phone;

  const { login } = useAuthStore();
  const haptics = useHaptics();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const destination = isPhoneFlow ? phone : email || 'your email';

  const handleVerify = useCallback(async () => {
    if (loading || code.trim().length < 6) return;
    setError('');
    setLoading(true);
    try {
      // Both verify endpoints return a full AuthResponse — tokens are issued here
      const authResponse = isPhoneFlow
        ? await authApi.verifyPhone({ phoneNumber: phone, code: code.trim() })
        : await authApi.verifyEmail({ email, code: code.trim() });
      await login(authResponse);
      haptics.success();
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(e?.friendlyMessage ?? 'Invalid code. Please try again.');
      haptics.error();
    } finally {
      setLoading(false);
    }
  }, [code, loading, email, phone, isPhoneFlow, login]);

  const handleResend = useCallback(async () => {
    if (resending || (!email && !phone)) return;
    setResending(true);
    setError('');
    try {
      if (isPhoneFlow) {
        await authApi.resendPhoneVerification(phone);
      } else {
        await authApi.resendVerification(email);
      }
      setResent(true);
      haptics.success();
      setTimeout(() => setResent(false), 5000);
    } catch (e: any) {
      setError(e?.friendlyMessage ?? 'Could not resend the code. Please wait a moment.');
      haptics.error();
    } finally {
      setResending(false);
    }
  }, [resending, email, phone, isPhoneFlow]);

  return (
    <RotatingBackground
      overlayColors={['rgba(10,5,32,0.35)', 'rgba(10,5,32,0.65)', 'rgba(10,5,32,0.9)'] as const}
      style={styles.container}
    >
      <LightBeam opacity={0.1} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Floating logo — identical to the login screen */}
          <View style={styles.logoArea}>
            <FloatingElement amplitude={6} duration={3000}>
              <View style={styles.logoCircle}>
                <LinearGradient colors={Gradients.glory} style={styles.logoGradient}>
                  <Text style={styles.logoK}>K</Text>
                </LinearGradient>
              </View>
            </FloatingElement>
            <Text style={styles.appName}>Klink</Text>
          </View>

          {/* Glass card */}
          <ScrollReveal delay={200}>
            <View style={styles.card}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />

              <Text style={styles.cardTitle}>
                {isPhoneFlow ? 'Verify your phone' : 'Verify your email'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {isPhoneFlow
                  ? `We texted a 6-digit code to ${destination}.`
                  : `We emailed a 6-digit code to ${destination}.`}
              </Text>

              <KlinkInput
                label="6-digit code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={handleVerify}
                autoFocus
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}
              {resent ? (
                <Text style={styles.success}>
                  {isPhoneFlow ? 'Code sent! Check your messages.' : 'Code sent! Check your inbox.'}
                </Text>
              ) : null}

              <KlinkButton
                label={isPhoneFlow ? 'Verify phone' : 'Verify email'}
                onPress={handleVerify}
                loading={loading}
                disabled={code.trim().length < 6 || loading}
              />
              <KlinkButton
                label={resending ? 'Sending…' : 'Resend code'}
                onPress={handleResend}
                variant="ghost"
                loading={resending}
              />

              <TouchableOpacity
                onPress={() => router.replace('/(auth)/login')}
                style={styles.backBtn}
                accessibilityRole="link"
                accessibilityLabel="Back to sign in"
              >
                <Text style={styles.backText}>Back to sign in</Text>
              </TouchableOpacity>
            </View>
          </ScrollReveal>
        </ScrollView>
      </KeyboardAvoidingView>
    </RotatingBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.pagePadding,
    paddingVertical: Spacing.xxl,
    gap: Spacing.xl,
  },
  logoArea: { alignItems: 'center', gap: Spacing.sm },
  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: 'hidden',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoK: {
    color: Colors.purple,
    fontSize: 44,
    fontWeight: FontWeight.bold,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  appName: {
    color: Colors.white,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.wider,
  },
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
  cardTitle: {
    color: Colors.white,
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: FontSize.small,
    lineHeight: FontSize.small * 1.6,
    marginTop: -Spacing.sm,
  },
  error: { color: Colors.red, fontSize: FontSize.small, textAlign: 'center' },
  success: { color: Colors.success, fontSize: FontSize.small, textAlign: 'center' },
  backBtn: { alignItems: 'center', paddingVertical: Spacing.sm, minHeight: 44, justifyContent: 'center' },
  backText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.medium },
});
