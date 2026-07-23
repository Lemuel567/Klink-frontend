import React, { useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { ModalPhotoBackground } from '../../src/components/common/ModalPhotoBackground';
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
import { TypewriterText } from '../../src/components/animations/TypewriterText';

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

  // ── Profile photo picking + upload ──────────────────────────────────────
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const uploadPhoto = async (uri: string) => {
    try {
      setUploadingPhoto(true);
      const name = uri.split('/').pop() ?? 'photo.jpg';
      const ext = name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const url = await membersApi.uploadPhoto(user!.id, {
        uri,
        name,
        type: ext === 'png' ? 'image/png' : 'image/jpeg',
      });
      updateUser({ photoUrl: url });
      queryClient.invalidateQueries({ queryKey: ['member', user?.id] });
      haptics.success();
      showToast('Profile photo updated', 'success');
    } catch (err: any) {
      haptics.heavy();
      showToast(err?.friendlyMessage ?? 'Could not upload the photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const pickImage = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access in Settings to change your photo.');
      return;
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      // 0.5 keeps an avatar visually perfect (it renders at ~100px) while
      // cutting the upload to a fraction — critical over slow tunnels where
      // a 0.8-quality multi-MB photo regularly timed out.
      quality: 0.5,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets?.[0]?.uri) {
      uploadPhoto(result.assets[0].uri);
    }
  };

  const handlePhotoPress = () => {
    haptics.light();
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickImage('camera');
          if (buttonIndex === 2) pickImage('library');
        },
      );
    } else {
      Alert.alert('Profile photo', 'Choose a source', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take photo', onPress: () => pickImage('camera') },
        { text: 'Choose from library', onPress: () => pickImage('library') },
      ]);
    }
  };

  return (
    // Modal screens sit ABOVE the shared photo backdrop, so the WHOLE screen
    // carries its own rotating worship photos — glass cards float over them.
    <ModalPhotoBackground overlayOpacity={0.62} overlayColor="#1A0533" style={styles.container}>
      {/* ── Header — transparent over the full-screen photo ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.headerBack}>‹</Text>
        </TouchableOpacity>

        <TypewriterText text="Edit Profile" style={styles.headerTitle} charDelayMs={42} />

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
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Avatar — tap to change photo ── */}
          <ScrollReveal delay={0}>
            <View style={styles.avatarWrap}>
              <TouchableOpacity
                onPress={handlePhotoPress}
                disabled={uploadingPhoto}
                accessibilityRole="button"
                accessibilityLabel="Change profile photo"
                style={styles.avatarTouch}
              >
                <KlinkAvatar
                  name={fullName || user?.fullName || ''}
                  photoUrl={user?.photoUrl}
                  size={100}
                />
                {/* Camera badge — always visible over the photo */}
                <View style={styles.cameraBadge}>
                  {uploadingPhoto ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
                        stroke={Colors.white}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Circle cx={12} cy={13} r={4} stroke={Colors.white} strokeWidth={2} />
                    </Svg>
                  )}
                </View>
              </TouchableOpacity>
              <Text style={[styles.avatarHint, { color: theme.textMuted }]}>
                {uploadingPhoto ? 'Uploading…' : 'Tap to change photo'}
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
                // Long names must FIT the box, not clip at its edge — step the
                // font down as the name grows (TextInput has no auto-shrink).
                style={
                  fullName.length > 30
                    ? { fontSize: 12.5 }
                    : fullName.length > 22
                      ? { fontSize: 14 }
                      : undefined
                }
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
    </ModalPhotoBackground>
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
  avatarTouch: { position: 'relative' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0A0520',
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
