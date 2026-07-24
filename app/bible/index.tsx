import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PhotoHeader } from '../../src/components/common/PhotoHeader';
import { TypewriterText } from '../../src/components/animations/TypewriterText';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { bibleApi, AssistantTurn } from '../../src/api/assistant';
import { getDailyVerse } from '../../src/utils/dailyVerse';
import { Colors } from '../../src/theme/colors';
import { FontFamily, FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';

interface Message extends AssistantTurn {
  id: number;
  failed?: boolean;
}

const SUGGESTIONS = [
  'What does this verse mean?',
  'How can I apply this today?',
  'What is the context of this verse?',
];

export default function BibleScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const verse = useMemo(() => getDailyVerse(), []);

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [headerH, setHeaderH] = useState(0);
  const nextId = useRef(1);
  const scrollRef = useRef<ScrollView>(null);

  const { data: reflection, isLoading: loadingReflection, isError: reflectionError, refetch } = useQuery({
    queryKey: ['bible-reflection', verse.reference],
    queryFn: () => bibleApi.reflection(verse.reference, verse.text),
  });

  const { mutate: send, isPending } = useMutation({
    mutationFn: ({ question, history }: { question: string; history: AssistantTurn[] }) =>
      bibleApi.chat(verse.reference, verse.text, question, history),
    onSuccess: (answer) => {
      haptics.light();
      setMessages((prev) => [...prev, { id: nextId.current++, role: 'assistant', text: answer }]);
    },
    onError: (err: any) => {
      haptics.error();
      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, role: 'assistant', failed: true, text: err?.friendlyMessage ?? "Sorry — I couldn't answer right now. Please try again." },
      ]);
    },
  });

  const ask = (question: string) => {
    const q = question.trim();
    if (!q || isPending) return;
    haptics.light();
    const history: AssistantTurn[] = messages.filter((m) => !m.failed).map(({ role, text }) => ({ role, text }));
    setMessages((prev) => [...prev, { id: nextId.current++, role: 'user', text: q }]);
    setDraft('');
    send({ question: q, history });
  };

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages.length, isPending]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PhotoHeader
        style={[styles.header, { paddingTop: insets.top + 12 }]}
        onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.eyebrow}>DAILY WORD</Text>
        <TypewriterText text="Today's Verse" style={styles.headerTitle} charDelayMs={42} />
      </PhotoHeader>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerH : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* The verse */}
          <ScrollReveal delay={0}>
            <View style={styles.verseCard}>
              <Text style={styles.verseQuote} accessible={false}>“</Text>
              <Text style={styles.verseText}>{verse.text}</Text>
              <Text style={styles.verseRef}>{verse.reference}</Text>
            </View>
          </ScrollReveal>

          {/* AI reflection */}
          <ScrollReveal delay={80}>
            <View style={[styles.reflectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={styles.reflectionLabel}>✨ REFLECTION</Text>
              {loadingReflection ? (
                <View style={styles.reflectLoading}>
                  <ActivityIndicator size="small" color={Colors.gold} />
                  <Text style={styles.reflectLoadingText}>Preparing today's reflection…</Text>
                </View>
              ) : reflectionError ? (
                <TouchableOpacity onPress={() => refetch()} accessibilityRole="button" accessibilityLabel="Retry reflection">
                  <Text style={styles.reflectRetry}>Couldn't load the reflection. Tap to try again.</Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.reflectionText, { color: theme.textSecondary }]}>{reflection}</Text>
              )}
            </View>
          </ScrollReveal>

          {/* Discussion */}
          <ScrollReveal delay={140}>
            <Text style={styles.discussLabel}>💬 DISCUSS THIS VERSE</Text>
          </ScrollReveal>

          {messages.length === 0 ? (
            <View style={styles.chips}>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity key={s} onPress={() => ask(s)} style={styles.chip} accessibilityRole="button" accessibilityLabel={`Ask: ${s}`}>
                  <Text style={styles.chipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            messages.map((m) => (
              <View
                key={m.id}
                style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant, m.failed && styles.bubbleFailed]}
              >
                <Text style={m.role === 'user' ? styles.bubbleUserText : styles.bubbleAssistantText}>{m.text}</Text>
              </View>
            ))
          )}
          {isPending && <ThinkingBubble />}
        </ScrollView>

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask about this verse…"
            placeholderTextColor="rgba(255,255,255,0.45)"
            style={styles.input}
            multiline
            maxLength={1000}
            editable={!isPending}
            selectionColor={Colors.gold}
            accessibilityLabel="Your question about the verse"
          />
          <TouchableOpacity
            onPress={() => ask(draft)}
            disabled={!draft.trim() || isPending}
            style={[styles.sendBtn, (!draft.trim() || isPending) && styles.sendBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Send question"
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function ThinkingBubble() {
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(0.35);
  useEffect(() => {
    if (reducedMotion) return;
    pulse.value = withRepeat(withTiming(1, { duration: 550, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(pulse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <View style={[styles.bubble, styles.bubbleAssistant, styles.thinking]}>
      {[0, 1, 2].map((i) => <Animated.View key={i} style={[styles.thinkingDot, dotStyle]} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.md, gap: 2 },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  eyebrow: { color: Colors.gold, fontSize: 11, fontWeight: FontWeight.semiBold, letterSpacing: 2.2, textTransform: 'uppercase' },
  headerTitle: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.tight },
  scroll: { padding: Spacing.pagePadding, gap: Spacing.md, paddingBottom: Spacing.lg },
  verseCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg, gap: Spacing.sm,
    backgroundColor: 'rgba(244,164,41,0.1)', borderWidth: 1, borderColor: 'rgba(244,164,41,0.35)',
    borderTopColor: 'rgba(255,255,255,0.28)', position: 'relative', overflow: 'hidden',
  },
  verseQuote: { position: 'absolute', top: -18, left: 6, fontFamily: FontFamily.displayBold, fontSize: 90, color: 'rgba(244,164,41,0.16)' },
  verseText: { color: Colors.white, fontFamily: FontFamily.displayItalic, fontSize: FontSize.h4, lineHeight: FontSize.h4 * 1.5 },
  verseRef: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.wide },
  reflectionCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  reflectionLabel: { color: Colors.gold, fontSize: FontSize.caption, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.wide },
  reflectionText: { fontSize: FontSize.body, lineHeight: FontSize.body * 1.7 },
  reflectLoading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  reflectLoadingText: { color: Colors.gold, fontSize: FontSize.small },
  reflectRetry: { color: 'rgba(245,240,255,0.7)', fontSize: FontSize.small },
  discussLabel: { color: Colors.gold, fontSize: FontSize.caption, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.wide },
  chips: { gap: Spacing.sm },
  chip: {
    borderWidth: 1, borderColor: 'rgba(244,164,41,0.4)', backgroundColor: 'rgba(30,19,64,0.5)',
    borderRadius: BorderRadius.full, minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.md,
  },
  chipText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.medium },
  bubble: { maxWidth: '90%', borderRadius: BorderRadius.xl, padding: Spacing.md },
  bubbleUser: {
    alignSelf: 'flex-end', backgroundColor: 'rgba(244,164,41,0.2)', borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.35)', borderBottomRightRadius: 6,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(30,19,64,0.75)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)', borderTopColor: 'rgba(255,255,255,0.22)', borderBottomLeftRadius: 6,
  },
  bubbleFailed: { borderColor: 'rgba(220,38,38,0.5)' },
  bubbleUserText: { color: Colors.white, fontSize: FontSize.body, lineHeight: FontSize.body * 1.5 },
  bubbleAssistantText: { color: '#F5F0FF', fontSize: FontSize.body, lineHeight: FontSize.body * 1.55 },
  thinking: { flexDirection: 'row', gap: 6, paddingVertical: Spacing.md },
  thinkingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.gold },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    paddingHorizontal: Spacing.pagePadding, paddingTop: Spacing.sm,
    backgroundColor: 'rgba(16,11,36,0.9)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1, color: '#FFFFFF', fontSize: FontSize.body, backgroundColor: 'rgba(30,19,64,0.6)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md, paddingTop: 12, paddingBottom: 12, maxHeight: 120, minHeight: 48,
  },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: '#1A0533', fontSize: 22, fontWeight: FontWeight.bold },
});
