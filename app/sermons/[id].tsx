import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScriptureReveal } from '../../src/components/church/ScriptureReveal';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { sermonsApi } from '../../src/api/sermons';
import { soundManager } from '../../src/utils/soundManager';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { formatDate } from '../../src/utils/formatters';

export default function SermonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const sermonSound = useRef<Audio.Sound | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [audioPosition, setAudioPosition] = useState<number>(0);

  const { data: sermon, isLoading } = useQuery({
    queryKey: ['sermon', id],
    queryFn: () => sermonsApi.list({ size: 100 }).then((r) => r.content.find((s) => s.id === id)),
    enabled: !!id,
  });

  // Clean up sermon audio and restore background music on unmount
  useEffect(() => {
    return () => {
      if (sermonSound.current) {
        sermonSound.current.stopAsync().catch(() => {});
        sermonSound.current.unloadAsync().catch(() => {});
        sermonSound.current = null;
      }
      // Resume background worship music when leaving the sermon screen
      if (soundManager.isMusicEnabled()) {
        soundManager.resumeBackgroundMusic().catch(() => {});
      }
    };
  }, []);

  const handlePlayPause = async () => {
    if (!sermon?.audioUrl) return;

    // ── PAUSE sermon ────────────────────────────────────────────────────────
    if (audioPlaying && sermonSound.current) {
      await sermonSound.current.pauseAsync().catch(() => {});
      setAudioPlaying(false);
      // Resume background music while sermon is paused
      if (soundManager.isMusicEnabled()) {
        soundManager.resumeBackgroundMusic().catch(() => {});
      }
      return;
    }

    // ── RESUME already-loaded sermon ────────────────────────────────────────
    if (sermonSound.current) {
      soundManager.pauseBackgroundMusic().catch(() => {});
      await sermonSound.current.playAsync().catch(() => {});
      setAudioPlaying(true);
      return;
    }

    // ── LOAD and PLAY sermon for the first time ──────────────────────────────
    try {
      setAudioLoading(true);
      soundManager.pauseBackgroundMusic().catch(() => {});

      const { sound } = await Audio.Sound.createAsync(
        { uri: sermon.audioUrl },
        { shouldPlay: true, volume: 1.0 },
      );
      sermonSound.current = sound;
      setAudioPlaying(true);

      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        setAudioPosition(status.positionMillis ?? 0);
        if (status.durationMillis) setAudioDuration(status.durationMillis);
        if (status.didJustFinish) {
          setAudioPlaying(false);
          setAudioPosition(0);
          // Background music resumes when sermon finishes
          if (soundManager.isMusicEnabled()) {
            soundManager.resumeBackgroundMusic().catch(() => {});
          }
        }
      });
    } catch (error) {
      console.log('Sermon audio error:', error);
      // Restore background music if sermon failed to load
      if (soundManager.isMusicEnabled()) {
        soundManager.resumeBackgroundMusic().catch(() => {});
      }
    } finally {
      setAudioLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const progressPercent =
    audioDuration && audioDuration > 0 ? (audioPosition / audioDuration) * 100 : 0;

  if (!sermon && !isLoading) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero */}
        <LinearGradient
          colors={Gradients.worship}
          style={[styles.hero, { paddingTop: insets.top + 16 }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessibilityRole="button">
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.sermonTitle}>{sermon?.title ?? ''}</Text>
          <Text style={styles.preacher}>{sermon?.preacher}</Text>
          <Text style={styles.date}>{sermon?.sermonDate ? formatDate(sermon.sermonDate) : ''}</Text>
        </LinearGradient>

        <View style={styles.content}>
          {sermon?.scripture && (
            <ScrollReveal delay={0}>
              <Text style={[styles.sectionLabel, { color: Colors.gold }]}>SCRIPTURE</Text>
              <ScriptureReveal
                verse={sermon.memoryVerse ?? 'Read the full passage in your Bible.'}
                reference={sermon.scripture}
              />
            </ScrollReveal>
          )}

          {sermon?.notes && (
            <ScrollReveal delay={100}>
              <Text style={[styles.sectionLabel, { color: Colors.gold }]}>SERMON NOTES</Text>
              <Text style={[styles.notes, { color: theme.textSecondary }]}>{sermon.notes}</Text>
            </ScrollReveal>
          )}

          {sermon?.audioUrl && (
            <ScrollReveal delay={200}>
              {/* Audio player */}
              <View style={styles.playerCard}>
                {/* Progress bar */}
                {audioDuration && (
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                  </View>
                )}

                {/* Time labels */}
                {audioDuration && (
                  <View style={styles.timeRow}>
                    <Text style={[styles.timeText, { color: theme.textMuted }]}>
                      {formatTime(audioPosition)}
                    </Text>
                    <Text style={[styles.timeText, { color: theme.textMuted }]}>
                      {formatTime(audioDuration)}
                    </Text>
                  </View>
                )}

                {/* Play / Pause button */}
                <TouchableOpacity
                  onPress={handlePlayPause}
                  disabled={audioLoading}
                  style={styles.playBtn}
                  accessibilityRole="button"
                  accessibilityLabel={audioPlaying ? 'Pause sermon audio' : 'Play sermon audio'}
                >
                  <LinearGradient colors={Gradients.glory} style={styles.playGradient}>
                    {audioLoading ? (
                      <ActivityIndicator color={Colors.purple} />
                    ) : (
                      <>
                        <Text style={styles.playIcon}>{audioPlaying ? '⏸' : '▶'}</Text>
                        <Text style={styles.playLabel}>
                          {audioPlaying ? 'Pause sermon' : 'Play sermon audio'}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {audioPlaying && (
                  <Text style={[styles.musicNote, { color: theme.textMuted }]}>
                    Worship music paused during sermon
                  </Text>
                )}
              </View>
            </ScrollReveal>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingHorizontal: Spacing.pagePadding,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32 },
  sermonTitle: {
    color: Colors.white,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
    lineHeight: FontSize.h2 * 1.2,
  },
  preacher: { color: Colors.gold, fontSize: FontSize.body, fontWeight: FontWeight.medium },
  date: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.small },
  content: { padding: Spacing.pagePadding, gap: Spacing.xl },
  sectionLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.widest,
    marginBottom: Spacing.sm,
  },
  notes: { fontSize: FontSize.body, lineHeight: FontSize.body * 1.75 },
  playerCard: {
    gap: Spacing.sm,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.gold,
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: { fontSize: FontSize.caption },
  playBtn: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  playGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 52,
  },
  playIcon: { color: Colors.purple, fontSize: 20, fontWeight: FontWeight.bold },
  playLabel: { color: Colors.purple, fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  musicNote: { fontSize: FontSize.caption, textAlign: 'center' },
});
