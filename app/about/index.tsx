import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { KlinkCard } from '../../src/components/common/KlinkCard';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { StaggerDelay } from '../../src/theme/animations';

const FAQ_ITEMS = [
  {
    question: 'What is Klink?',
    answer:
      'Klink is a church management platform that helps churches manage members, giving, attendance, groups, sermons, and more — all in one app.',
  },
  {
    question: 'How do I give through the app?',
    answer:
      'Open the Giving tab and follow the prompts to give securely via Paystack.',
  },
  {
    question: 'How do I submit a prayer request?',
    answer:
      'Go to the Prayer Wall tab, tap the add button, and share your request with your church community.',
  },
  {
    question: 'Where can I find sermons?',
    answer:
      'The Sermons tab has an archive of past messages you can watch or listen to anytime.',
  },
  {
    question: 'Who do I contact for support?',
    answer:
      'Reach out to your church admin or pastor through the app, or contact the Klink support team directly.',
  },
];

export default function AboutScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient colors={Gradients.darkWorship} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About & FAQ</Text>
        <Text style={styles.headerSub}>Everything you need to know about Klink</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: 100 }}>
        {FAQ_ITEMS.map((item, index) => (
          <ScrollReveal key={item.question} delay={index * StaggerDelay.list} style={styles.cardWrap}>
            <KlinkCard style={styles.card}>
              <Text style={[styles.question, { color: theme.text }]}>{item.question}</Text>
              <Text style={[styles.answer, { color: theme.textMuted }]}>{item.answer}</Text>
            </KlinkCard>
          </ScrollReveal>
        ))}
      </ScrollView>
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
  cardWrap: { marginHorizontal: Spacing.pagePadding, marginBottom: Spacing.sm },
  card: { gap: 6 },
  question: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  answer: { fontSize: FontSize.small, lineHeight: 20 },
});
