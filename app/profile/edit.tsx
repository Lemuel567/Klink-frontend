import React, { useEffect, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { KlinkAvatar } from '../../src/components/common/KlinkAvatar';
import { KlinkToast } from '../../src/components/common/KlinkToast';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { membersApi } from '../../src/api/members';
import { useAuthStore, useUser } from '../../src/store/authStore';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';

const CATEGORIES = ['ADULT', 'YOUTH', 'CHILDREN'] as const;
type Category = (typeof CATEGORIES)[number];

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const user = useUser();
  const { updateUser } = useAuthStore();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const queryClient = useQueryClient();

  // Initialise from store immediately so the form isn't blank while the query loads
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [category, setCategory] = useState<Category>(
    (user?.category as Category | undefined) ?? 'ADULT',
  );
  const [hydrated, setHydrated] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  // Load full member record to get phone (display) and dateOfBirth
  const { data: member, isLoading } = useQuery({
    queryKey: ['member', user?.id],
    queryFn: () => membersApi.get(user!.id),
    enabled: !!user?.id,
    staleTime: 0,
  });

  // Populate form once member data arrives — only once to avoid overwriting in-progress edits
  useEffect(() => {
    if (member && !hydrated) {
      setFullName(member.fullName ?? '');
      setPhone(member.phone ?? '');
      setDateOfBirth(member.dateOfBirth ?? '');
      setCategory((member.category as Category | undefined) ?? 'ADULT');
      setHydrated(true);
    }
  }, [member, hydrated]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: () =>
      membersApi.update(user!.id, {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        dateOfBirth: dateOfBirth.trim() || undefined,
        category,
      }),
    onSuccess: () => {
      // Sync local auth store so profile hero updates immediately
      updateUser({ fullName: fullName.trim(), category });
      queryClient.invalidateQueries({ queryKey: ['member', user?.id] });
      haptics.medium();
      showToast('Profile updated', 'success');
      setTimeout(() => router.back(), 1400);
    },
    onError: () => {
      haptics.heavy();
      showToast('Could not save changes', 'error');
    },
  });

  const handleSave = () => {
    if (!fullName.trim()) {
      showToast('Full name is required', 'error');
      return;
    }
    save();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ── Header ── */}
      <LinearGradient
        colors={Gradients.darkWorship}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.headerBack}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Edit Profile</Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending || isLoading}
          style={styles.headerBtn}
          accessibilityLabel="Save profile"
          accessibilityRole="button"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.headerSave, (isPending || isLoading) && styles.headerSaveDisabled]}>
            Save
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Avatar ── */}
          <ScrollReveal delay={0}>
            <View style={styles.avatarWrap}>
              <KlinkAvatar
                name={fullName || user?.fullName || ''}
                photoUrl={user?.photoUrl}
                size={88}
              />
              <Text style={[styles.avatarHint, { color: theme.textMuted }]}>
                Photo upload coming soon
              </Text>
            </View>
          </ScrollReveal>

          {/* ── Form ── */}
          <ScrollReveal delay={80}>
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionLabel, { color: Colors.gold }]}>PERSONAL INFO</Text>

              <KlinkInput
                label="Full name"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                returnKeyType="next"
                editable={!isPending}
              />

              <KlinkInput
                label="Display phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="next"
                editable={!isPending}
              />

              <KlinkInput
                label="Date of birth"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="YYYY-MM-DD"
                returnKeyType="done"
                editable={!isPending}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
          </ScrollReveal>

          {/* ── Category ── */}
          <ScrollReveal delay={140}>
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionLabel, { color: Colors.gold }]}>CATEGORY</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((cat) => {
                  const active = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => { haptics.light(); setCategory(cat); }}
                      style={[
                        styles.chip,
                        { borderColor: active ? Colors.gold : theme.border },
                        active && styles.chipActive,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                    >
                      <Text style={[styles.chipText, { color: active ? Colors.gold : theme.textMuted }]}>
                        {cat.charAt(0) + cat.slice(1).toLowerCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollReveal>

          {/* ── Read-only fields ── */}
          <ScrollReveal delay={200}>
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionLabel, { color: Colors.gold }]}>ACCOUNT</Text>
              <ReadonlyRow label="Email" value={user?.email ?? '—'} theme={theme} />
              <ReadonlyRow label="Role" value={user?.role ?? '—'} theme={theme} last />
            </View>
          </ScrollReveal>

          {/* ── Save button ── */}
          <ScrollReveal delay={260}>
            <View style={styles.saveWrap}>
              <KlinkButton
                label="Save changes"
                onPress={handleSave}
                loading={isPending}
                disabled={isLoading}
              />
            </View>
          </ScrollReveal>
        </ScrollView>
      </KeyboardAvoidingView>

      {toast && (
        <KlinkToast
          message={toast.message}
          type={toast.type}
          visible
          onHide={() => setToast(null)}
        />
      )}
    </View>
  );
}

function ReadonlyRow({
  label,
  value,
  theme,
  last,
}: {
  label: string;
  value: string;
  theme: any;
  last?: boolean;
}) {
  return (
    <View style={[styles.readonlyRow, !last && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
      <Text style={[styles.readonlyLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.readonlyValue, { color: theme.textSecondary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.pagePadding,
    paddingBottom: Spacing.md,
  },
  headerBtn: { minWidth: 48, alignItems: 'center' },
  headerBack: {
    color: Colors.white,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: FontWeight.regular,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSize.h4,
    fontWeight: FontWeight.bold,
  },
  headerSave: {
    color: Colors.gold,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semiBold,
  },
  headerSaveDisabled: { opacity: 0.4 },

  scroll: {
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },

  avatarWrap: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  avatarHint: {
    fontSize: FontSize.caption,
  },

  card: {
    marginHorizontal: Spacing.pagePadding,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },

  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: 'rgba(244,164,41,0.1)',
  },
  chipText: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semiBold,
  },

  readonlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  readonlyLabel: { fontSize: FontSize.small },
  readonlyValue: { fontSize: FontSize.small, fontWeight: FontWeight.medium },

  saveWrap: {
    paddingHorizontal: Spacing.pagePadding,
    marginTop: Spacing.sm,
  },
});
