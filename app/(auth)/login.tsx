import React, { useState, useCallback } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { AmbientGlow } from '../../src/components/animations/AmbientGlow';
import { FloatingElement } from '../../src/components/animations/FloatingElement';
import { LightBeam } from '../../src/components/animations/LightBeam';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { Congregation } from '../../src/components/worship';
import { TypewriterText } from '../../src/components/animations/TypewriterText';
import { authApi } from '../../src/api/auth';
import { useAuthStore } from '../../src/store/authStore';
import { useHaptics } from '../../src/hooks/useHaptics';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontFamily, FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';

const { width, height } = Dimensions.get('window');

type LoginMethod = 'email' | 'phone';

// Phone login must send the stored E.164 identifier — accept "+233…" as-is
// and convert Ghana local "024…" so members can type the number they know.
function normalizeE164(raw: string): string | null {
  const p = raw.replace(/[\s\-()]/g, '');
  if (/^\+[1-9]\d{6,14}$/.test(p)) return p;
  if (/^0\d{9}$/.test(p)) return `+233${p.slice(1)}`;
  return null;
}

export default function LoginScreen() {
  const [method, setMethod] = useState<LoginMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuthStore();
  const haptics = useHaptics();

  const handleLogin = useCallback(async () => {
    if (loading) return;
    setError('');

    const identifier = method === 'email' ? email.trim() : phone.trim();
    if (!identifier || !password) {
      setError('Please fill in all fields.');
      haptics.error();
      return;
    }

    let phoneE164: string | null = null;
    if (method === 'phone') {
      phoneE164 = normalizeE164(identifier);
      if (!phoneE164) {
        setError('Enter your phone in international format, e.g. +233241234567 (or 024… for Ghana).');
        haptics.error();
        return;
      }
    }

    setLoading(true);
    try {
      const body = method === 'email'
        ? { email: identifier, password }
        : { phoneNumber: phoneE164!, password };
      const data = await authApi.login(body);
      await login(data);
      haptics.success();
      router.replace('/(tabs)/home');
    } catch (e: any) {
      const msg = e?.friendlyMessage ?? 'Login failed. Check your credentials.';
      setError(msg);
      haptics.error();
    } finally {
      setLoading(false);
    }
  }, [method, email, phone, password, loading]);

  const switchMethod = useCallback((m: LoginMethod) => {
    haptics.light();
    setMethod(m);
    setError('');
  }, []);

  return (
    // The rotating worship photos come from the ONE global RotatingBackground
    // behind the transparent stack (_layout.tsx). This veil only adds the
    // difference between the global underlay [.45/.6/.75] and login's intended
    // [.35/.65/.9] — rendering a second full rotation here doubled GPU work.
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(10,5,32,0)', 'rgba(10,5,32,0.13)', 'rgba(10,5,32,0.6)'] as const}
        style={StyleSheet.absoluteFill}
      />
      <LightBeam opacity={0.1} />

      {/* Ambient light blobs (ui-ux-pro-max Cinema Mobile spec) — slow-drifting
          gold + purple glows behind the glass */}
      <AmbientGlow color="rgba(244,164,41,0.13)" size={300} style={{ top: -70, right: -90 }} />
      <AmbientGlow
        color="rgba(107,63,160,0.18)"
        size={340}
        style={{ bottom: 60, left: -130 }}
        durationMs={14000}
        driftX={-22}
        driftY={24}
      />

      {/* Worship congregation silhouette anchored at the base, behind the card.
          Kept short and faint: on shorter Android viewports the taller silhouette
          rose through the translucent card and visually overlapped the
          "Register your church" button (taller iPhones cleared it). */}
      <View style={styles.congregation} pointerEvents="none">
        <Congregation width={width} height={Math.min(width * 0.4, 200)} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Editorial masthead — left-aligned, oversized serif display */}
          <View style={styles.masthead}>
            <View style={styles.brandRow}>
              <FloatingElement amplitude={6} duration={3000}>
                <View style={styles.logoCircle}>
                  <LinearGradient colors={Gradients.glory} style={styles.logoGradient}>
                    <Text style={styles.logoK}>K</Text>
                  </LinearGradient>
                </View>
              </FloatingElement>
              <Text style={styles.wordmark}>KLINK</Text>
            </View>
            <Text style={styles.eyebrow}>Church community · Ghana</Text>
            <Text style={styles.displayLine}>Welcome</Text>
            {/* "home." writes itself — the first living text you see */}
            <TypewriterText
              text="home."
              style={[styles.displayLine, styles.displayItalic]}
              startDelayMs={700}
              charDelayMs={110}
              cursor
            />
            <View style={styles.mastheadRule} />
          </View>

          {/* Glass card */}
          <ScrollReveal delay={200}>
            <View style={styles.card}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />

              <Text style={styles.cardEyebrow}>Sign in</Text>

              {/* Method toggle */}
              <View style={styles.toggle}>
                <TouchableOpacity
                  onPress={() => switchMethod('email')}
                  style={[styles.toggleBtn, method === 'email' && styles.toggleActive]}
                  accessibilityRole="button"
                  accessibilityLabel="Sign in with email"
                >
                  <Text style={[styles.toggleText, method === 'email' && styles.toggleTextActive]}>
                    Email
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => switchMethod('phone')}
                  style={[styles.toggleBtn, method === 'phone' && styles.toggleActive]}
                  accessibilityRole="button"
                  accessibilityLabel="Sign in with phone"
                >
                  <Text style={[styles.toggleText, method === 'phone' && styles.toggleTextActive]}>
                    Phone
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Inputs */}
              {method === 'email' ? (
                <KlinkInput
                  label="Email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                />
              ) : (
                <KlinkInput
                  label="Phone number (+233...)"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  returnKeyType="next"
                />
              )}

              <KlinkInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                rightIcon={
                  <Text style={styles.showHide}>{showPassword ? 'Hide' : 'Show'}</Text>
                }
                onRightIconPress={() => setShowPassword((v) => !v)}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                // Cast: expo-router's typed-route cache (.expo/types) regenerates to
                // include this newly-added screen on the next `expo start`.
                onPress={() => router.push('/(auth)/forgot-password' as any)}
                style={styles.forgotBtn}
                accessibilityRole="link"
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              <KlinkButton label="Sign in" onPress={handleLogin} loading={loading} />

              <View style={styles.registerRow}>
                <Text style={styles.registerPrompt}>New member? </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/register')}
                  accessibilityRole="link"
                >
                  <Text style={styles.registerLink}>Join your church</Text>
                </TouchableOpacity>
              </View>

              {/* Pastors get their own prominent entry point — church creation was
                  previously hidden behind a toggle inside the register screen */}
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/(auth)/register', params: { mode: 'create' } })}
                style={styles.registerChurchBtn}
                accessibilityRole="button"
                accessibilityLabel="Register your church"
              >
                <Text style={styles.registerChurchText} numberOfLines={1} adjustsFontSizeToFit>
                  ⛪ Pastor? Register your church
                </Text>
              </TouchableOpacity>

              <Text style={styles.social}>Trusted by churches across Ghana</Text>
            </View>
          </ScrollReveal>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  congregation: { position: 'absolute', left: 0, right: 0, bottom: -16, opacity: 0.45 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.pagePadding,
    // xxxl pushed the content past shorter Android viewports; the overflow put
    // the bottom of the card on top of the silhouette.
    paddingVertical: Spacing.xl,
  },
  // Editorial masthead (2026-07-18 layout redesign)
  masthead: { marginBottom: Spacing.lg, gap: Spacing.sm },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 16,
  },
  logoGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoK: { color: Colors.purple, fontSize: 26, fontWeight: FontWeight.bold },
  wordmark: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: FontWeight.bold,
    letterSpacing: 4,
  },
  eyebrow: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: FontWeight.semiBold,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  displayLine: {
    color: Colors.white,
    fontFamily: FontFamily.displayBold,
    fontSize: 44,
    lineHeight: 50,
  },
  displayItalic: {
    fontFamily: FontFamily.displayItalic,
    color: Colors.gold,
  },
  mastheadRule: {
    height: 1,
    width: 72,
    backgroundColor: 'rgba(244,164,41,0.35)',
    marginTop: Spacing.xs,
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
    borderTopColor: 'rgba(255,255,255,0.32)', // light edge — light from above
  },
  cardEyebrow: {
    color: 'rgba(245,240,255,0.65)',
    fontSize: 11,
    fontWeight: FontWeight.semiBold,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.full,
    padding: 4,
    marginBottom: Spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  toggleActive: { backgroundColor: Colors.gold },
  toggleText: { color: Colors.darkMuted, fontWeight: FontWeight.medium },
  toggleTextActive: { color: Colors.purple, fontWeight: FontWeight.semiBold },
  showHide: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.medium },
  errorText: {
    color: Colors.red,
    fontSize: FontSize.small,
    textAlign: 'center',
    lineHeight: FontSize.small * 1.5,
  },
  forgotBtn: { alignSelf: 'flex-end', paddingVertical: 4 },
  forgotText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.medium },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  registerPrompt: { color: Colors.darkMuted, fontSize: FontSize.small },
  registerLink: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  registerChurchBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(244,164,41,0.5)',
    borderRadius: BorderRadius.full,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  registerChurchText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.bold },
  social: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: FontSize.caption,
    textAlign: 'center',
    letterSpacing: LetterSpacing.wide,
    marginTop: Spacing.sm,
  },
});
