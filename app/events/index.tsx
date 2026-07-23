import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { PhotoHeader } from "../../src/components/common/PhotoHeader";
import { BlurView } from 'expo-blur';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EventCard } from '../../src/components/screens/EventCard';
import { AnnouncementSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { eventsApi, ChurchEvent } from '../../src/api/events';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import { PAGE_SIZE } from '../../src/utils/constants';
import { TypewriterText } from '../../src/components/animations/TypewriterText';
import { AIPolish } from '../../src/components/common/AIPolish';

const CAN_CREATE = ['PASTOR', 'ELDER', 'MANAGER'];

export default function EventsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();

  const canCreate = role ? CAN_CREATE.includes(role) : false;

  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [formError, setFormError] = useState('');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['events-all'],
      queryFn: ({ pageParam = 0 }) => eventsApi.list({ page: pageParam, size: PAGE_SIZE }),
      getNextPageParam: (last) =>
        last.number + 1 < last.totalPages ? last.number + 1 : undefined,
      initialPageParam: 0,
    });

  const events: ChurchEvent[] = data?.pages.flatMap((p) => p.content) ?? [];

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setCategory('');
    setDate('');
    setTime('');
    setFormError('');
  };

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: () =>
      eventsApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        category: category.trim() || undefined,
        // Backend eventDate is a LocalDateTime — combine the two plain fields
        eventDate: `${date.trim()}T${(time.trim() || '09:00')}:00`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events-all'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      haptics.success();
      setComposing(false);
      resetForm();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not create the event. Please try again.');
      haptics.error();
    },
  });

  const handleSubmit = () => {
    setFormError('');
    if (!title.trim()) {
      setFormError('Event title is required.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setFormError('Date must be in YYYY-MM-DD format.');
      return;
    }
    if (time.trim() && !/^\d{2}:\d{2}$/.test(time.trim())) {
      setFormError('Time must be in HH:MM format (24-hour).');
      return;
    }
    create();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PhotoHeader style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
         
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <TypewriterText text="Events" style={styles.headerTitle} charDelayMs={42} />
        <Text style={styles.headerSub}>What's happening in your church</Text>
      </PhotoHeader>

      {isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 5 }, (_, i) => <AnnouncementSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <EventCard
              event={item}
              index={index}
              onPress={() =>
                router.push({
                  pathname: '/events/[id]',
                  params: {
                    id: item.id,
                    title: item.title,
                    description: item.description ?? '',
                    eventDate: item.eventDate,
                    location: item.location ?? '',
                    category: item.category ?? '',
                  },
                })
              }
            />
          )}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />}
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: canCreate ? 120 : 100 }}
          ListEmptyComponent={
            <EmptyState
              icon="📅"
              title="No upcoming events"
              subtitle={canCreate ? 'Add the first event so members know what is coming up.' : 'Check back soon for what is next.'}
              actionLabel={canCreate ? '+ Add event' : undefined}
              onAction={canCreate ? () => setComposing(true) : undefined}
            />
          }
        />
      )}

      {/* Create FAB — Pastor / Elder / Manager */}
      {canCreate && (
        <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            onPress={() => { haptics.medium(); setComposing(true); }}
            style={styles.fab}
            accessibilityRole="button"
            accessibilityLabel="Add an event"
          >
            <LinearGradient colors={Gradients.glory} style={styles.fabGradient}>
              <Text style={styles.fabText}>+ Add event</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Compose modal */}
      <Modal
        visible={composing}
        transparent
        animationType="fade"
        onRequestClose={() => setComposing(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />

            <Text style={styles.modalTitle}>New event</Text>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
            >
              <KlinkInput
                label="Event title"
                value={title}
                onChangeText={setTitle}
                autoCapitalize="sentences"
                maxLength={200}
              />
              <KlinkInput
                label="Description (optional)"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={2000}
                autoCapitalize="sentences"
              />
              <AIPolish text={description} onResult={setDescription} contentType="a church event description" />
              <View style={{ height: 12 }} />
              <KlinkInput
                label="Location (optional)"
                value={location}
                onChangeText={setLocation}
                maxLength={300}
              />
              <KlinkInput
                label="Category (optional)"
                value={category}
                onChangeText={setCategory}
                maxLength={100}
              />

              {/* Dates use label-above plain inputs — long floating labels
                  overlap typed dates (see new-project form rule) */}
              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.dateLabel}>DATE</Text>
                  <TextInput
                    value={date}
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    style={styles.dateInput}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                    selectionColor={Colors.gold}
                  />
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.dateLabel}>TIME (24H)</Text>
                  <TextInput
                    value={time}
                    onChangeText={setTime}
                    placeholder="09:00"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    style={styles.dateInput}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    selectionColor={Colors.gold}
                  />
                </View>
              </View>

              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { haptics.light(); setComposing(false); }}
                style={styles.modalCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.modalSubmit}>
                <KlinkButton
                  label="Create Event"
                  onPress={handleSubmit}
                  disabled={!title.trim() || !date.trim() || creating}
                  loading={creating}
                />
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
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.lg, gap: 4 },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  headerTitle: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.tight },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  fabContainer: { position: 'absolute', right: Spacing.pagePadding, bottom: 0 },
  fab: { borderRadius: BorderRadius.full, overflow: 'hidden' },
  fabGradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.body },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: Spacing.pagePadding,
  },
  modalCard: {
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalGlass: {
    borderRadius: BorderRadius.xxl,
    backgroundColor: 'rgba(26,31,62,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  modalTitle: { color: Colors.white, fontSize: FontSize.h4, fontWeight: FontWeight.bold },
  modalScroll: { maxHeight: 440 },
  dateRow: { flexDirection: 'row', gap: Spacing.md },
  dateField: { flex: 1 },
  dateLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wider,
    marginBottom: 6,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: FontSize.body,
  },
  formError: { color: Colors.red, fontSize: FontSize.small, marginTop: Spacing.sm },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  modalCancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  modalCancelText: { color: Colors.darkMuted, fontSize: FontSize.body, fontWeight: FontWeight.medium },
  modalSubmit: { flex: 1 },
});
