import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { membersApi } from '../../src/api/members';
import { Colors } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';

// Backend: POST /members/register is Pastor / Elder / Manager only.
// These are members WITHOUT smartphones — they get a QR card and SMS
// notifications instead of the app, which is why this screen exists.
const CAN_REGISTER = ['PASTOR', 'ELDER', 'MANAGER'];

const CATEGORIES = ['ADULT', 'YOUTH', 'CHILDREN'] as const;

export default function RegisterMemberScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [category, setCategory] = useState<string>('ADULT');
  const [error, setError] = useState('');

  const canRegister = role ? CAN_REGISTER.includes(role) : false;

  const { mutate: register, isPending } = useMutation({
    mutationFn: () =>
      membersApi.registerOffline({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        dateOfBirth: dateOfBirth.trim() || undefined,
        category,
      }),
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      haptics.success();
      Alert.alert(
        'Member registered',
        `${member.fullName} has been added to the church. They will receive SMS notifications${phone.trim() ? '' : ' once a phone number is added'}.`,
        [
          { text: 'Add another', onPress: () => { setFullName(''); setPhone(''); setDateOfBirth(''); setError(''); } },
          { text: 'Done', onPress: () => router.back() },
        ],
      );
    },
    onError: (err: any) => {
      setError(err?.friendlyMessage ?? 'Could not register the member. Please try again.');
      haptics.error();
    },
  });

  const handleSubmit = () => {
    setError('');
    if (!fullName.trim()) {
      setError('Full name is required.');
      haptics.error();
      return;
    }
    if (dateOfBirth.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
      setError('Date of birth must be in YYYY-MM-DD format.');
      haptics.error();
      return;
    }
    register();
  };

  if (!canRegister) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.xxl }]}>
        <EmptyState
          icon="🔒"
          title="Leaders only"
          subtitle="Only a Pastor, Elder, or Manager can register members without smartphones."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

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

          <Text style={styles.title}>Register a member</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            For members without smartphones. They get a QR attendance card and
            receive church news by SMS — no app account is created.
          </Text>

          <View style={styles.card}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.cardGlass]} />

            <KlinkInput
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              maxLength={200}
            />
            <KlinkInput
              label="Phone number (for SMS, optional)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={20}
            />

            {/* Date uses a label-above plain input — floating labels overlap typed dates */}
            <Text style={styles.fieldLabel}>DATE OF BIRTH (OPTIONAL)</Text>
            <TextInput
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.plainInput}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              selectionColor={Colors.gold}
            />

            <Text style={styles.fieldLabel}>CATEGORY</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => { haptics.light(); setCategory(c); }}
                  style={[styles.chip, category === c && styles.chipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: category === c }}
                >
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <KlinkButton
              label="Register Member"
              onPress={handleSubmit}
              disabled={!fullName.trim() || isPending}
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
  fieldLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wider,
    marginBottom: 6,
  },
  plainInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: FontSize.body,
    marginBottom: Spacing.md,
  },
  chipRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipActive: { borderColor: Colors.gold, backgroundColor: 'rgba(244,164,41,0.18)' },
  chipText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.small, fontWeight: FontWeight.medium },
  chipTextActive: { color: Colors.gold, fontWeight: FontWeight.semiBold },
  error: { color: Colors.red, fontSize: FontSize.small, marginBottom: Spacing.sm },
});
