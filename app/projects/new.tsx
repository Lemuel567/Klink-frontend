import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { mediaApi } from '../../src/api/media';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { projectsApi } from '../../src/api/projects';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';

// Matches backend ProjectType enum exactly
const PROJECT_TYPES = [
  'CONSTRUCTION', 'RENOVATION', 'PURCHASE', 'COMMUNITY_OUTREACH',
  'EDUCATION', 'HEALTH', 'TECHNOLOGY', 'OTHER',
] as const;
type ProjectType = (typeof PROJECT_TYPES)[number];

// 2026-07-12: creation is Pastor + Manager ONLY (matches backend)
const CAN_CREATE = ['PASTOR', 'MANAGER'];

function typeLabel(t: string) {
  return t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, ' ');
}

export default function NewProjectScreen() {
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('CONSTRUCTION');
  const [targetAmount, setTargetAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState<string[]>([]); // uploaded URLs
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const addPhoto = async () => {
    haptics.light();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    try {
      setUploadingPhoto(true);
      const uri = result.assets[0].uri;
      const name = uri.split('/').pop() ?? 'project.jpg';
      const ext = name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const uploaded = await mediaApi.upload(
        { uri, name, type: ext === 'png' ? 'image/png' : 'image/jpeg' },
        'projects',
      );
      setPhotos((prev) => [...prev, uploaded.imageUrl]);
      haptics.success();
    } catch (err: any) {
      haptics.error();
      Alert.alert('Error', err?.friendlyMessage ?? 'Photo upload failed.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const { mutate: create, isPending } = useMutation({
    mutationFn: () =>
      projectsApi.create({
        title: title.trim(),
        description: description.trim(),
        projectType,
        targetAmount: parseFloat(targetAmount),
        startDate: startDate.trim() || undefined,
        expectedEndDate: expectedEndDate.trim() || undefined,
        location: location.trim() || undefined,
      }),
    onSuccess: async (project) => {
      // Attach the picked photos to the freshly-created project (first = cover)
      for (let i = 0; i < photos.length; i++) {
        try {
          await projectsApi.addImage(project.id, { imageUrl: photos[i], isPrimary: i === 0 });
        } catch { /* one bad image must not block creation */ }
      }
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      haptics.success();
      router.replace({ pathname: '/projects/[id]', params: { id: project.id } });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not create the project.');
      haptics.error();
    },
  });

  const handleSubmit = useCallback(() => {
    setError('');
    if (!title.trim()) { setError('Project title is required.'); haptics.error(); return; }
    if (!description.trim()) { setError('Describe what the church wants to achieve.'); haptics.error(); return; }
    const amount = parseFloat(targetAmount);
    if (!targetAmount.trim() || isNaN(amount) || amount <= 0) {
      setError('Enter a target amount greater than 0.');
      haptics.error();
      return;
    }
    for (const [label, v] of [['Start date', startDate], ['Expected end date', expectedEndDate]] as const) {
      if (v.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) {
        setError(`${label} must be YYYY-MM-DD.`);
        haptics.error();
        return;
      }
    }
    create();
  }, [title, description, targetAmount, startDate, expectedEndDate, create]);

  // Only leadership can create — everyone else sees a friendly notice
  if (!role || !CAN_CREATE.includes(role)) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={Gradients.veil} style={StyleSheet.absoluteFill} />
        <View style={[styles.infoWrap, { paddingTop: insets.top + 32 }]}>
          <Text style={styles.infoIcon}>🏗️</Text>
          <Text style={styles.infoTitle}>Projects are created by leaders</Text>
          <Text style={styles.infoBody}>
            Your Pastor or church leadership creates projects. You can view every project and
            contribute to the ones close to your heart.
          </Text>
          <KlinkButton label="Back to Projects" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={Gradients.veil} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.heading}>New Church Project</Text>
            <Text style={styles.sub}>
              Share what the church wants to achieve — members will see it and can contribute.
              New projects start as PROPOSED.
            </Text>
          </View>

          <ScrollReveal delay={100}>
            <View style={styles.card}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />

              <KlinkInput label="Project title" value={title} onChangeText={setTitle} autoCapitalize="sentences" />
              <KlinkInput
                label="Description"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={5}
                style={styles.multiline}
                autoCapitalize="sentences"
              />

              <Text style={styles.fieldLabel}>Project type</Text>
              <View style={styles.typeGrid}>
                {PROJECT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => { haptics.light(); setProjectType(t); }}
                    style={[
                      styles.typeChip,
                      { borderColor: projectType === t ? Colors.gold : 'rgba(255,255,255,0.15)' },
                      projectType === t && styles.typeChipActive,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: projectType === t }}
                  >
                    <Text style={[styles.typeChipText, { color: projectType === t ? Colors.gold : Colors.darkMuted }]}>
                      {typeLabel(t)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <KlinkInput
                label="Target amount (GHS)"
                value={targetAmount}
                onChangeText={setTargetAmount}
                keyboardType="decimal-pad"
              />
              {/* Dates — label ABOVE (the long floating labels overlapped typed text) */}
              <View style={styles.dateRow}>
                <View style={styles.dateCol}>
                  <Text style={styles.aboveLabel}>START DATE (OPTIONAL)</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={startDate}
                    onChangeText={setStartDate}
                    autoCapitalize="none"
                    keyboardType="numbers-and-punctuation"
                    accessibilityLabel="Start date"
                  />
                </View>
                <View style={styles.dateCol}>
                  <Text style={styles.aboveLabel}>EXPECTED END (OPTIONAL)</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={expectedEndDate}
                    onChangeText={setExpectedEndDate}
                    autoCapitalize="none"
                    keyboardType="numbers-and-punctuation"
                    accessibilityLabel="Expected end date"
                  />
                </View>
              </View>
              <KlinkInput label="Location (optional)" value={location} onChangeText={setLocation} />

              {/* Photos — added to the project right after creation */}
              <Text style={styles.aboveLabel}>PHOTOS ({photos.length}) — FIRST IS THE COVER</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                {photos.map((url, i) => (
                  <TouchableOpacity
                    key={url}
                    onLongPress={() => setPhotos((prev) => prev.filter((u) => u !== url))}
                    accessibilityLabel={`Photo ${i + 1} — long press to remove`}
                  >
                    <ExpoImage source={{ uri: url }} style={styles.photoThumb} contentFit="cover" />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={addPhoto}
                  disabled={uploadingPhoto}
                  style={styles.addPhotoBox}
                  accessibilityRole="button"
                  accessibilityLabel="Add a photo"
                >
                  {uploadingPhoto ? <ActivityIndicator color={Colors.gold} /> : <Text style={styles.addPhotoPlus}>＋</Text>}
                </TouchableOpacity>
              </ScrollView>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <KlinkButton
                label="Create Project"
                onPress={handleSubmit}
                disabled={isPending}
                loading={isPending}
              />
            </View>
          </ScrollReveal>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row', gap: Spacing.sm },
  dateCol: { flex: 1 },
  aboveLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: FontWeight.semiBold,
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    color: Colors.white,
    fontSize: FontSize.body,
    minHeight: 52,
  },
  photoRow: { gap: Spacing.sm, paddingVertical: 4 },
  photoThumb: { width: 72, height: 72, borderRadius: 12 },
  addPhotoBox: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(244,164,41,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoPlus: { color: Colors.gold, fontSize: 26 },
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.pagePadding,
    paddingBottom: Spacing.xxl,
    gap: Spacing.xl,
  },
  header: { gap: Spacing.sm },
  closeBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  closeIcon: { color: Colors.white, fontSize: 20 },
  heading: {
    color: Colors.white,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  sub: { color: Colors.darkMuted, fontSize: FontSize.small, lineHeight: 20 },
  card: { borderRadius: BorderRadius.xxl, overflow: 'hidden', padding: Spacing.lg, gap: Spacing.md },
  glassOverlay: {
    borderRadius: BorderRadius.xxl,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  fieldLabel: { color: Colors.white, fontSize: FontSize.body, fontWeight: FontWeight.medium },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeChip: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  typeChipActive: { backgroundColor: 'rgba(244,164,41,0.12)' },
  typeChipText: { fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  errorText: { color: Colors.red, fontSize: FontSize.small },
  infoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  infoIcon: { fontSize: 48 },
  infoTitle: { color: Colors.white, fontSize: FontSize.h3, fontWeight: FontWeight.bold, textAlign: 'center' },
  infoBody: { color: Colors.darkMuted, fontSize: FontSize.body, textAlign: 'center', lineHeight: 24 },
});
