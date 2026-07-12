import React from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { eventsApi } from '../../src/api/events';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import { confirmDelete } from '../../src/utils/confirmDelete';
import { formatDate } from '../../src/utils/formatters';

const CAN_DELETE = ['PASTOR', 'ELDER', 'MANAGER'];

// Backend has no GET /events/{id} — the list screen passes the event through params.
type EventParams = {
  id: string;
  title?: string;
  description?: string;
  eventDate?: string;
  location?: string;
  category?: string;
};

function daysUntil(dateStr?: string): string | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const diffMs = target.getTime() - Date.now();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days < 0) return 'This event has passed';
  if (days === 0) return 'Happening today! 🎉';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export default function EventDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<EventParams>();

  const canDelete = role ? CAN_DELETE.includes(role) : false;
  const countdown = daysUntil(params.eventDate);

  const eventDate = params.eventDate ? new Date(params.eventDate) : null;
  const day = eventDate && !isNaN(eventDate.getTime()) ? eventDate.getDate().toString().padStart(2, '0') : '--';
  const month =
    eventDate && !isNaN(eventDate.getTime())
      ? eventDate.toLocaleString('default', { month: 'short' }).toUpperCase()
      : '';

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: () => eventsApi.delete(params.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events-all'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      haptics.success();
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not delete this event.');
      haptics.error();
    },
  });

  const handleShare = async () => {
    haptics.light();
    try {
      await Share.share({
        message: `${params.title ?? 'Church event'}\n${formatDate(params.eventDate ?? '')}${
          params.location ? `\n📍 ${params.location}` : ''
        }${params.description ? `\n\n${params.description}` : ''}\n\n— shared from Klink`,
      });
    } catch {
      // user dismissed the share sheet
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxl }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={Gradients.heaven} style={[styles.hero, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <View style={styles.dateBlock}>
            <Text style={styles.day}>{day}</Text>
            <Text style={styles.month}>{month}</Text>
          </View>

          <Text style={styles.title}>{params.title ?? 'Church event'}</Text>
          {countdown && <Text style={styles.countdown}>{countdown}</Text>}
        </LinearGradient>

        <View style={styles.body}>
          <ScrollReveal delay={100}>
            <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <InfoRow label="When" value={params.eventDate ? formatDate(params.eventDate) : 'To be announced'} theme={theme} />
              {params.location ? <InfoRow label="Where" value={params.location} theme={theme} /> : null}
              {params.category ? <InfoRow label="Category" value={params.category} theme={theme} /> : null}
            </View>
          </ScrollReveal>

          {params.description ? (
            <ScrollReveal delay={200}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>ABOUT THIS EVENT</Text>
              <Text style={[styles.description, { color: theme.textSecondary }]}>{params.description}</Text>
            </ScrollReveal>
          ) : null}

          <ScrollReveal delay={300}>
            <TouchableOpacity
              onPress={handleShare}
              style={styles.shareBtn}
              accessibilityRole="button"
              accessibilityLabel="Share this event"
            >
              <LinearGradient colors={Gradients.glory} style={styles.shareGradient}>
                <Text style={styles.shareText}>Share Event ↗</Text>
              </LinearGradient>
            </TouchableOpacity>

            {canDelete && (
              <TouchableOpacity
                onPress={() => {
                  haptics.heavy();
                  confirmDelete({
                    title: 'Delete event?',
                    message: 'This removes the event for the whole church.',
                    onConfirm: () => remove(),
                  });
                }}
                disabled={deleting}
                style={styles.deleteBtn}
                accessibilityRole="button"
                accessibilityLabel="Delete this event"
              >
                <Text style={styles.deleteText}>{deleting ? 'Deleting…' : 'Delete Event'}</Text>
              </TouchableOpacity>
            )}
          </ScrollReveal>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingHorizontal: Spacing.pagePadding,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xxl,
    borderBottomRightRadius: BorderRadius.xxl,
    gap: Spacing.sm,
  },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  dateBlock: {
    width: 68,
    height: 68,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold, lineHeight: FontSize.h2 * 1.1 },
  month: { color: Colors.white, fontSize: FontSize.caption, fontWeight: FontWeight.semiBold, letterSpacing: 1 },
  title: {
    color: Colors.white,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
    lineHeight: FontSize.h2 * 1.2,
  },
  countdown: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.body, fontWeight: FontWeight.medium },
  body: { padding: Spacing.pagePadding, gap: Spacing.lg },
  infoCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, minHeight: 24 },
  infoLabel: { fontSize: FontSize.small, fontWeight: FontWeight.medium },
  infoValue: { fontSize: FontSize.small, fontWeight: FontWeight.semiBold, flex: 1, textAlign: 'right' },
  sectionLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.widest,
    marginBottom: Spacing.sm,
  },
  description: { fontSize: FontSize.body, lineHeight: FontSize.body * 1.7 },
  shareBtn: { borderRadius: BorderRadius.full, overflow: 'hidden' },
  shareGradient: {
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.body },
  deleteBtn: {
    marginTop: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.red,
    borderRadius: BorderRadius.full,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: { color: Colors.red, fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
});
