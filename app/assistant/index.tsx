import React, { useEffect, useRef, useState } from 'react';
import {
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
import { useMutation } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PhotoHeader } from '../../src/components/common/PhotoHeader';
import { TypewriterText } from '../../src/components/animations/TypewriterText';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { assistantApi, AssistantTurn } from '../../src/api/assistant';
import { Colors } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';

interface Message extends AssistantTurn {
  id: number;
  failed?: boolean;
}

// Starter questions shown on the empty screen — one tap to ask
const SUGGESTIONS = [
  'How do I give online?',
  'How do I check in at church?',
  'How do I set up automatic giving?',
  'How can I change my vote in a poll?',
  'What can I do in my group?',
];

export default function AssistantScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [headerH, setHeaderH] = useState(0);
  const nextId = useRef(1);
  const scrollRef = useRef<ScrollView>(null);

  const { mutate: send, isPending } = useMutation({
    mutationFn: ({ question, history }: { question: string; history: AssistantTurn[] }) =>
      assistantApi.ask(question, history),
    onSuccess: (answer) => {
      haptics.light();
      setMessages((prev) => [...prev, { id: nextId.current++, role: 'assistant', text: answer }]);
    },
    onError: (err: any) => {
      haptics.error();
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          role: 'assistant',
          failed: true,
          text: err?.friendlyMessage ?? "Sorry — I couldn't answer right now. Please try again.",
        },
      ]);
    },
  });

  const ask = (question: string) => {
    const q = question.trim();
    if (!q || isPending) return;
    haptics.light();
    // History = everything BEFORE this question (failed turns excluded)
    const history: AssistantTurn[] = messages
      .filter((m) => !m.failed)
      .map(({ role, text }) => ({ role, text }));
    setMessages((prev) => [...prev, { id: nextId.current++, role: 'user', text: q }]);
    setDraft('');
    send({ question: q, history });
  };

  // Keep the newest message in view
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.eyebrow}>KLINK HELPER</Text>
        <TypewriterText text="Ask Klink" style={styles.headerTitle} charDelayMs={42} />
        <Text style={styles.headerSub}>Anything about the app — I'll point the way</Text>
      </PhotoHeader>

      <KeyboardAvoidingView
        style={styles.flex}
        // Android needs an explicit JS behavior: SDK 54 enables edge-to-edge,
        // which breaks the native window-resize that `undefined` relied on, so
        // the keyboard covered the composer. 'height' shrinks the view above
        // the keyboard. iOS keeps its working 'padding' + header offset.
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerH : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <ScrollReveal delay={0}>
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  What can I help you with?
                </Text>
                <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                  Ask me anything about using Klink — giving, checking in, polls, groups, your
                  account — and I'll show you exactly where to go.
                </Text>
                <View style={styles.chips}>
                  {SUGGESTIONS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => ask(s)}
                      style={styles.chip}
                      accessibilityRole="button"
                      accessibilityLabel={`Ask: ${s}`}
                    >
                      <Text style={styles.chipText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollReveal>
          ) : (
            messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.bubble,
                  m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                  m.failed && styles.bubbleFailed,
                ]}
              >
                {m.role === 'assistant' && !m.failed && (
                  <Text style={styles.bubbleBadge}>✨ ASK KLINK</Text>
                )}
                <Text style={m.role === 'user' ? styles.bubbleUserText : styles.bubbleAssistantText}>
                  {m.text}
                </Text>
              </View>
            ))
          )}
          {isPending && <ThinkingBubble />}
        </ScrollView>

        {/* Chat composer — plain TextInput per the chat-composer rule
            (KlinkInput's floating label breaks chat composers) */}
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask me anything about Klink…"
            placeholderTextColor="rgba(255,255,255,0.45)"
            style={styles.input}
            multiline
            maxLength={1000}
            editable={!isPending}
            selectionColor={Colors.gold}
            accessibilityLabel="Your question"
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

/** Three gold dots pulsing while the helper thinks. Reduce-motion → static. */
function ThinkingBubble() {
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(0.35);

  useEffect(() => {
    if (reducedMotion) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: 550, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={[styles.bubble, styles.bubbleAssistant, styles.thinking]}>
      {[0, 1, 2].map((i) => (
        <Animated.View key={i} style={[styles.thinkingDot, dotStyle]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.md, gap: 2 },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  eyebrow: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: FontWeight.semiBold,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  messages: { padding: Spacing.pagePadding, gap: Spacing.sm, paddingBottom: Spacing.lg },
  emptyWrap: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.xl },
  emptyIcon: { fontSize: 42 },
  emptyTitle: { fontSize: FontSize.h4, fontWeight: FontWeight.bold },
  emptySub: {
    fontSize: FontSize.small,
    textAlign: 'center',
    lineHeight: FontSize.small * 1.6,
    paddingHorizontal: Spacing.md,
  },
  chips: { gap: Spacing.sm, marginTop: Spacing.md, alignSelf: 'stretch' },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.4)',
    backgroundColor: 'rgba(30,19,64,0.5)',
    borderRadius: BorderRadius.full,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  chipText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.medium },
  bubble: {
    maxWidth: '86%',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: 4,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(244,164,41,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.35)',
    borderBottomRightRadius: 6,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(30,19,64,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderTopColor: 'rgba(255,255,255,0.22)',
    borderBottomLeftRadius: 6,
  },
  bubbleFailed: { borderColor: 'rgba(220,38,38,0.5)' },
  bubbleBadge: {
    color: Colors.gold,
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.2,
  },
  bubbleUserText: { color: Colors.white, fontSize: FontSize.body, lineHeight: FontSize.body * 1.5 },
  bubbleAssistantText: {
    color: '#F5F0FF',
    fontSize: FontSize.body,
    lineHeight: FontSize.body * 1.55,
  },
  thinking: { flexDirection: 'row', gap: 6, paddingVertical: Spacing.md },
  thinkingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.gold },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.pagePadding,
    paddingTop: Spacing.sm,
    backgroundColor: 'rgba(16,11,36,0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: FontSize.body,
    backgroundColor: 'rgba(30,19,64,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    maxHeight: 120,
    minHeight: 48,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: '#1A0533', fontSize: 22, fontWeight: FontWeight.bold },
});
