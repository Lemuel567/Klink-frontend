import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useMutation } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { authApi } from '../../src/api/auth';
import { useAuthStore } from '../../src/store/authStore';
import { Colors } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';

export default function ChangePasswordScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const logout = useAuthStore((s) => s.logout);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');

  const { mutate: change, isPending } = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      haptics.success();
      // The backend bumps tokenVersion and revokes every refresh token on
      // password change — this session is already dead, so sign out cleanly.
      Alert.alert(
        'Password changed',
        'For your security you have been signed out everywhere. Please log in with your new password.',
        [{ text: 'OK', onPress: () => { logout(); router.replace('/(auth)/login'); } }],
      );
    },
    onError: (err: any) => {
      setError(err?.friendlyMessage ?? 'Could not change your password. Please try again.');
      haptics.error();
    },
  });

  const handleSubmit = () => {
    setError('');
    if (!currentPassword) {
      setError('Enter your current password.');
      haptics.error();
      return;
    }
    // Backend requires @Size(min = 12) on the new password
    if (newPassword.length < 12) {
      setError('New password must be at least 12 characters.');
      haptics.error();
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      haptics.error();
      return;
    }
    change();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
         
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Change password</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Changing your password signs you out of every device.
          </Text>

          <View style={styles.card}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.cardGlass]} />

            <KlinkInput
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showPasswords}
              autoCapitalize="none"
              rightIcon={<Text style={styles.showHide}>{showPasswords ? 'Hide' : 'Show'}</Text>}
              onRightIconPress={() => setShowPasswords((v) => !v)}
            />
            <KlinkInput
              label="New password (12+ characters)"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPasswords}
              autoCapitalize="none"
            />
            <KlinkInput
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPasswords}
              autoCapitalize="none"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <KlinkButton
              label="Change Password"
              onPress={handleSubmit}
              disabled={!currentPassword || !newPassword || !confirmPassword || isPending}
              loading={isPending}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.pagePadding, paddingBottom: 60 },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  title: {
    color: Colors.white,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  subtitle: { fontSize: FontSize.small, lineHeight: FontSize.small * 1.6, marginTop: 6, marginBottom: Spacing.lg },
  card: {
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  cardGlass: {
    borderRadius: BorderRadius.xxl,
    backgroundColor: 'rgba(26,31,62,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  showHide: { color: Colors.gold, fontSize: FontSize.caption, fontWeight: FontWeight.semiBold },
  error: { color: Colors.red, fontSize: FontSize.small, marginBottom: Spacing.sm },
});
