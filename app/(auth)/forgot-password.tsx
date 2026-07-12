import React, { useState, useCallback } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { CrossWithRays } from '../../src/components/worship';
import { authApi } from '../../src/api/auth';
import { useHaptics } from '../../src/hooks/useHaptics';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';

type Step = 'request' | 'reset';

export default function ForgotPasswordScreen() {
  const haptics = useHaptics();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleRequest = useCallback(async () => {
    if (loading) return;
    setError('');
    if (!emailValid) {
      setError('Please enter a valid email address.');
      haptics.error();
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      haptics.success();
      setNotice('If that email is registered, a 6-digit reset code is on its way.');
      setStep('reset');
    } catch (e: any) {
      // Backend intentionally does not reveal whether the email exists;
      // still advance so the flow can't be used for email enumeration.
      setNotice('If that email is registered, a 6-digit reset code is on its way.');
      setStep('reset');
    } finally {
      setLoading(false);
    }
  }, [email, emailValid, loading]);

  const handleReset = useCallback(async () => {
    if (loading) return;
    setError('');
    if (code.trim().length < 6) {
      setError('Enter the 6-digit code from your email.');
      haptics.error();
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      haptics.error();
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      haptics.error();
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ email: email.trim(), code: code.trim(), newPassword });
      haptics.success();
      router.replace('/(auth)/login');
    } catch (e: any) {
      setError(e?.friendlyMessage ?? 'Could not reset password. Check the code and try again.');
      haptics.error();
    } finally {
      setLoading(false);
    }
  }, [email, code, newPassword, confirmPassword, loading]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={Gradients.veil} style={StyleSheet.absoluteFill} />
      <View style={styles.art} pointerEvents="none">
        <CrossWithRays width={260} height={260} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inner}>
          <ScrollReveal delay={0}>
            <Text style={styles.heading}>
              {step === 'request' ? 'Reset your password' : 'Enter your code'}
            </Text>
            <Text style={styles.sub}>
              {step === 'request'
                ? "Enter your email and we'll send you a 6-digit reset code."
                : `We sent a code to ${email}. Enter it with your new password.`}
            </Text>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <View style={styles.card}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />

              {step === 'request' ? (
                <>
                  <KlinkInput
                    label="Email address"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="send"
                    onSubmitEditing={handleRequest}
                  />
                  {error ? <Text style={styles.error}>{error}</Text> : null}
                  <KlinkButton label="Send reset code" onPress={handleRequest} loading={loading} />
                </>
              ) : (
                <>
                  {notice ? <Text style={styles.notice}>{notice}</Text> : null}
                  <KlinkInput
                    label="6-digit code"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    returnKeyType="next"
                  />
                  <KlinkInput
                    label="New password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password-new"
                    textContentType="newPassword"
                    rightIcon={<Text style={styles.showHide}>{showPassword ? 'Hide' : 'Show'}</Text>}
                    onRightIconPress={() => setShowPassword((v) => !v)}
                  />
                  <KlinkInput
                    label="Confirm new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleReset}
                  />
                  {error ? <Text style={styles.error}>{error}</Text> : null}
                  <KlinkButton label="Reset password" onPress={handleReset} loading={loading} />
                  <KlinkButton
                    label="Resend code"
                    variant="ghost"
                    onPress={handleRequest}
                    loading={loading}
                  />
                </>
              )}

              <KlinkButton
                label="Back to sign in"
                variant="ghost"
                onPress={() => router.replace('/(auth)/login')}
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
  art: { position: 'absolute', top: '8%', alignSelf: 'center', opacity: 0.4 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.pagePadding, gap: Spacing.xl },
  heading: { color: Colors.white, fontSize: FontSize.h1, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  sub: { color: Colors.darkMuted, fontSize: FontSize.body, lineHeight: FontSize.body * 1.6 },
  card: { borderRadius: BorderRadius.xxl, overflow: 'hidden', padding: Spacing.lg, gap: Spacing.md },
  glassOverlay: {
    borderRadius: BorderRadius.xxl,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  error: { color: Colors.red, fontSize: FontSize.small, textAlign: 'center' },
  notice: { color: Colors.green, fontSize: FontSize.small, textAlign: 'center', lineHeight: FontSize.small * 1.5 },
  showHide: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.medium },
});
