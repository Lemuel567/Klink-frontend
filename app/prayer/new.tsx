import React, { useCallback, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { DoveAnimation } from '../../src/components/church/DoveAnimation';
import { ModalPhotoBackground } from '../../src/components/common/ModalPhotoBackground';
import { ScreenPhotos } from '../../src/utils/worshipImages';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useHaptics } from '../../src/hooks/useHaptics';
import { prayerRequestsApi, PrayerVisibility } from '../../src/api/prayerRequests';

const VISIBILITY_OPTIONS: { key: PrayerVisibility; label: string; color: string; desc: string }[] = [
  { key: 'PUBLIC', label: 'Public', color: Colors.gold, desc: 'Visible to the whole church' },
  { key: 'PRIVATE', label: 'Private', color: Colors.purpleLight, desc: 'Only your Pastor and Elders' },
];

const TITLE_MAX = 200;
const CONTENT_MAX = 5000;

export default function NewPrayerRequestScreen() {
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<PrayerVisibility>('PUBLIC');
  const [titleError, setTitleError] = useState('');
  const [contentError, setContentError] = useState('');
  const [showDove, setShowDove] = useState(false);

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () =>
      prayerRequestsApi.create({ title: title.trim(), content: content.trim(), visibility }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-requests'] });
      haptics.success();
      // Dove flies before we return — a moment of peace on success
      setShowDove(true);
      setTimeout(() => router.back(), 1800);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not send your prayer request. Please try again.');
      haptics.error();
    },
  });

  const handleSubmit = useCallback(() => {
    setTitleError('');
    setContentError('');
    if (!title.trim()) {
      setTitleError('Give your request a short title.');
      haptics.error();
      return;
    }
    if (!content.trim()) {
      setContentError('Share what you would like prayer for.');
      haptics.error();
      return;
    }
    submit();
  }, [title, content, submit]);

  return (
    <ModalPhotoBackground imageSource={ScreenPhotos.prayerNew} overlayOpacity={0.66} style={styles.container}>
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
            <Text style={styles.heading}>Share a prayer request</Text>
            <Text style={styles.sub}>
              "Carry each other's burdens, and in this way you will fulfill the law of Christ." — Galatians 6:2
            </Text>
          </View>

          {/* Visibility selector */}
          <ScrollReveal delay={100}>
            <View style={styles.typeGrid}>
              {VISIBILITY_OPTIONS.map((v) => (
                <TouchableOpacity
                  key={v.key}
                  onPress={() => { haptics.light(); setVisibility(v.key); }}
                  style={[
                    styles.typeCard,
                    { borderColor: visibility === v.key ? v.color : 'rgba(255,255,255,0.1)' },
                    visibility === v.key && { backgroundColor: `${v.color}15` },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: visibility === v.key }}
                  accessibilityLabel={`${v.label}: ${v.desc}`}
                >
                  <Text style={[styles.typeLabel, { color: visibility === v.key ? v.color : Colors.darkMuted }]}>
                    {v.label}
                  </Text>
                  <Text style={[styles.typeDesc, { color: Colors.darkMuted }]}>{v.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <View style={styles.card}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />

              <KlinkInput
                label="Title"
                value={title}
                onChangeText={setTitle}
                maxLength={TITLE_MAX}
                autoCapitalize="sentences"
                error={titleError}
              />

              <KlinkInput
                label="What would you like prayer for?"
                value={content}
                onChangeText={setContent}
                maxLength={CONTENT_MAX}
                multiline
                numberOfLines={6}
                style={styles.contentInput}
                autoCapitalize="sentences"
                error={contentError}
              />

              <KlinkButton
                label="Send Prayer Request"
                onPress={handleSubmit}
                disabled={!title.trim() || !content.trim() || isPending}
                loading={isPending}
              />
            </View>
          </ScrollReveal>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Dove overlay on success — decorative, does not block interaction */}
      {showDove && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={styles.doveOverlay}
          pointerEvents="none"
        >
          <DoveAnimation size={90} />
          <Text style={styles.doveText}>Your church is praying with you</Text>
        </Animated.View>
      )}
    </ModalPhotoBackground>
  );
}

const styles = StyleSheet.create({
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
  sub: { color: Colors.darkMuted, fontSize: FontSize.small, fontStyle: 'italic', lineHeight: 20 },
  typeGrid: { flexDirection: 'row', gap: Spacing.sm },
  typeCard: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    padding: Spacing.md,
    gap: 4,
    minHeight: 44,
  },
  typeLabel: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  typeDesc: { fontSize: FontSize.caption },
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
  contentInput: { minHeight: 120, textAlignVertical: 'top' },
  doveOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,15,46,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  doveText: {
    color: Colors.white,
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
});
