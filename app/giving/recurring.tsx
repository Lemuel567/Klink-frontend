import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PhotoHeader } from '../../src/components/common/PhotoHeader';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { AnnouncementSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { confirmDelete } from '../../src/utils/confirmDelete';
import { givingSchedulesApi, GivingSchedule } from '../../src/api/givingSchedules';
import { OnlinePaymentType, paymentTypeLabel } from '../../src/api/payments';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { formatCurrency } from '../../src/utils/formatters';
import { TypewriterText } from '../../src/components/animations/TypewriterText';

const TYPES: OnlinePaymentType[] = ['TITHE', 'OFFERING', 'WELFARE', 'BUILDING_FUND', 'MISSIONS', 'OTHER'];

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function RecurringGivingScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const queryClient = useQueryClient();

  const [composing, setComposing] = useState(false);
  const [type, setType] = useState<OnlinePaymentType>('TITHE');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('1');

  const { data: schedules, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['giving-schedules'],
    queryFn: () => givingSchedulesApi.list(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['giving-schedules'] });

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: () =>
      givingSchedulesApi.create({
        paymentType: type,
        amount: parseFloat(amount),
        dayOfMonth: parseInt(day, 10),
      }),
    onSuccess: () => {
      invalidate();
      haptics.success();
      setComposing(false);
      setAmount('');
      setDay('1');
      setType('TITHE');
    },
    onError: (err: any) => {
      haptics.error();
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not create the schedule.');
    },
  });

  const { mutate: toggle, isPending: toggling } = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => givingSchedulesApi.setActive(id, active),
    onSuccess: () => { invalidate(); haptics.light(); },
    onError: (err: any) => { haptics.error(); Alert.alert('Error', err?.friendlyMessage ?? 'Could not update.'); invalidate(); },
  });

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: (id: string) => givingSchedulesApi.delete(id),
    onSuccess: () => { invalidate(); haptics.success(); },
    onError: (err: any) => { haptics.error(); Alert.alert('Error', err?.friendlyMessage ?? 'Could not delete.'); },
  });

  // One in-flight schedule mutation at a time — double-tapping the switch or
  // Delete must not fire duplicate requests.
  const busy = toggling || removing;

  const dayNum = parseInt(day, 10);
  const amountNum = parseFloat(amount);
  const canSubmit = !isNaN(amountNum) && amountNum >= 1 && amountNum <= 50000 && dayNum >= 1 && dayNum <= 28;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PhotoHeader style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.eyebrow}>STEWARDSHIP</Text>
        <TypewriterText text="Recurring Giving" style={styles.headerTitle} charDelayMs={42} />
        <Text style={styles.headerSub}>Set it once — Klink reminds you every month</Text>
      </PhotoHeader>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />}
        contentContainerStyle={{ padding: Spacing.pagePadding, paddingBottom: 100, gap: Spacing.sm }}
      >
        {isLoading ? (
          Array.from({ length: 3 }, (_, i) => <AnnouncementSkeleton key={i} />)
        ) : (schedules?.length ?? 0) === 0 ? (
          <EmptyState
            icon="🔁"
            title="No schedules yet"
            subtitle="Set up a monthly tithe or offering and Klink will remind you on the day, ready to give in one tap."
            actionLabel="+ New schedule"
            onAction={() => setComposing(true)}
          />
        ) : (
          schedules!.map((s: GivingSchedule, i: number) => (
            <ScrollReveal key={s.id} delay={i * 60}>
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={styles.cardMain}>
                  <Text style={[styles.cardType, { color: theme.text }]}>{paymentTypeLabel(s.paymentType)}</Text>
                  <Text style={[styles.cardAmount, { color: Colors.gold }]}>{formatCurrency(s.amount)}</Text>
                  <Text style={[styles.cardWhen, { color: theme.textMuted }]}>
                    Every month on the {ordinal(s.dayOfMonth)}
                    {s.active ? '' : ' · Paused'}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <Switch
                    value={s.active}
                    disabled={busy}
                    onValueChange={(v) => toggle({ id: s.id, active: v })}
                    trackColor={{ true: 'rgba(244,164,41,0.5)', false: 'rgba(255,255,255,0.15)' }}
                    thumbColor={s.active ? Colors.gold : '#888'}
                  />
                  <TouchableOpacity
                    disabled={busy}
                    onPress={() =>
                      confirmDelete({
                        title: 'Delete schedule?',
                        message: 'You will stop getting monthly reminders for this.',
                        onConfirm: () => remove(s.id),
                      })
                    }
                    style={styles.deleteLink}
                    accessibilityRole="button"
                    accessibilityLabel="Delete schedule"
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollReveal>
          ))
        )}

        {(schedules?.length ?? 0) > 0 && (
          <Text style={[styles.note, { color: theme.textMuted }]}>
            On the day you choose, Klink sends a reminder with a one-tap link to give. Mobile Money can't be charged
            automatically, so nothing is taken without you confirming.
          </Text>
        )}
      </ScrollView>

      {/* + New schedule FAB */}
      <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          onPress={() => { haptics.medium(); setComposing(true); }}
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel="New giving schedule"
        >
          <LinearGradient colors={Gradients.glory} style={styles.fabGradient}>
            <Text style={styles.fabText}>+ New schedule</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Create modal */}
      <Modal visible={composing} transparent animationType="fade" onRequestClose={() => { if (!creating) setComposing(false); }}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />
            <Text style={styles.modalTitle}>New schedule</Text>

            <Text style={styles.fieldLabel}>WHAT TO GIVE</Text>
            <View style={styles.chipRow}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => { haptics.light(); setType(t); }}
                  style={[styles.chip, type === t && styles.chipActive]}
                  disabled={creating}
                  accessibilityRole="button"
                  accessibilityState={{ selected: type === t }}
                >
                  <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{paymentTypeLabel(t)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <KlinkInput
              label="Amount (GHS)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              editable={!creating}
              maxLength={8}
            />

            <Text style={styles.fieldLabel}>DAY OF THE MONTH (1–28)</Text>
            <TextInput
              value={day}
              onChangeText={(t) => setDay(t.replace(/[^0-9]/g, '').slice(0, 2))}
              placeholder="1"
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={styles.dayInput}
              keyboardType="number-pad"
              editable={!creating}
              selectionColor={Colors.gold}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                disabled={creating}
                onPress={() => { haptics.light(); setComposing(false); }}
                style={styles.modalCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <KlinkButton label="Save schedule" onPress={() => canSubmit && create()} disabled={!canSubmit || creating} loading={creating} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.lg, gap: 2 },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  eyebrow: { color: Colors.gold, fontSize: 11, fontWeight: FontWeight.semiBold, letterSpacing: 2.2, textTransform: 'uppercase' },
  headerTitle: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.tight },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md },
  cardMain: { flex: 1, gap: 2 },
  cardType: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  cardAmount: { fontSize: FontSize.h4, fontWeight: FontWeight.bold },
  cardWhen: { fontSize: FontSize.caption },
  cardActions: { alignItems: 'flex-end', gap: 6 },
  deleteLink: { minHeight: 28, justifyContent: 'center' },
  deleteText: { color: Colors.red, fontSize: FontSize.caption, fontWeight: FontWeight.semiBold },
  note: { fontSize: FontSize.small, lineHeight: FontSize.small * 1.6, marginTop: Spacing.sm },
  fabContainer: { position: 'absolute', right: Spacing.pagePadding, bottom: 0 },
  fab: { borderRadius: BorderRadius.full, overflow: 'hidden' },
  fabGradient: { paddingHorizontal: Spacing.lg, paddingVertical: 14, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  fabText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.body },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: Spacing.pagePadding },
  modalCard: { borderRadius: BorderRadius.xxl, overflow: 'hidden', padding: Spacing.lg, gap: Spacing.sm },
  modalGlass: { borderRadius: BorderRadius.xxl, backgroundColor: 'rgba(26,31,62,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  modalTitle: { color: Colors.white, fontSize: FontSize.h4, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  fieldLabel: { color: 'rgba(255,255,255,0.55)', fontSize: FontSize.caption, fontWeight: FontWeight.semiBold, letterSpacing: LetterSpacing.wider, marginTop: Spacing.xs, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  chip: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
  chipActive: { borderColor: Colors.gold, backgroundColor: 'rgba(244,164,41,0.18)' },
  chipText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.caption, fontWeight: FontWeight.medium },
  chipTextActive: { color: Colors.gold, fontWeight: FontWeight.semiBold },
  dayInput: {
    borderWidth: 1, borderColor: 'rgba(244,164,41,0.4)', borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 12, color: Colors.white, fontSize: FontSize.body,
    alignSelf: 'flex-start', minWidth: 90, marginBottom: Spacing.sm,
  },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xs },
  modalCancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  modalCancelText: { color: Colors.darkMuted, fontSize: FontSize.body, fontWeight: FontWeight.medium },
});
