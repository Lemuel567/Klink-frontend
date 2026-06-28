import React, { useState, useCallback } from 'react';
import {
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
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useHaptics } from '../../src/hooks/useHaptics';

const GIVING_TYPES = [
  { key: 'TITHE', label: 'Tithe', color: Colors.gold, desc: '10% of your income' },
  { key: 'OFFERING', label: 'Offering', color: Colors.purple, desc: 'A freewill gift' },
  { key: 'WELFARE', label: 'Welfare', color: Colors.green, desc: 'Care for members in need' },
  { key: 'SPECIAL_CONTRIBUTION', label: 'Special', color: Colors.blue, desc: 'Building fund & more' },
];

export default function NewGivingScreen() {
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const [type, setType] = useState('TITHE');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [amountError, setAmountError] = useState('');

  const selected = GIVING_TYPES.find((t) => t.key === type)!;

  const handleSubmit = useCallback(() => {
    setAmountError('');
    const numericAmount = parseFloat(amount);
    if (!amount.trim() || isNaN(numericAmount)) {
      setAmountError('Please enter an amount.');
      haptics.error();
      return;
    }
    if (numericAmount <= 0) {
      setAmountError('Amount must be greater than 0.');
      haptics.error();
      return;
    }
    // Giving is recorded by the Financial Secretary on the backend.
    // This screen logs an intention; the FinSec confirms it.
    haptics.give();
    router.back();
  }, [amount, type]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={Gradients.darkWorship} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.heading}>Make a contribution</Text>
            <Text style={styles.sub}>Your giving builds God's Kingdom</Text>
          </View>

          {/* Type selector */}
          <ScrollReveal delay={100}>
            <View style={styles.typeGrid}>
              {GIVING_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => { haptics.light(); setType(t.key); }}
                  style={[
                    styles.typeCard,
                    { borderColor: type === t.key ? t.color : 'rgba(255,255,255,0.1)' },
                    type === t.key && { backgroundColor: `${t.color}15` },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: type === t.key }}
                  accessibilityLabel={`${t.label}: ${t.desc}`}
                >
                  <Text style={[styles.typeLabel, { color: type === t.key ? t.color : Colors.darkMuted }]}>
                    {t.label}
                  </Text>
                  <Text style={[styles.typeDesc, { color: Colors.darkMuted }]}>{t.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollReveal>

          {/* Amount */}
          <ScrollReveal delay={200}>
            <View style={styles.card}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />

              <Text style={styles.cardLabel}>{selected.label} amount</Text>
              <View style={styles.amountRow}>
                <Text style={[styles.currency, { color: selected.color }]}>GHS</Text>
                <KlinkInput
                  label="0.00"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  containerStyle={styles.amountInput}
                />
              </View>

              {amountError ? (
                <Text style={{ color: '#E74C3C', fontSize: 12, marginTop: -8 }}>{amountError}</Text>
              ) : null}

              <KlinkInput
                label="Note (optional)"
                value={note}
                onChangeText={setNote}
                multiline
              />

              <KlinkButton
                label={`Give ${amount ? `GHS ${amount}` : 'now'}`}
                onPress={handleSubmit}
                disabled={!amount.trim()}
              />
            </View>
          </ScrollReveal>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
  heading: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.tight },
  sub: { color: Colors.darkMuted, fontSize: FontSize.body },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeCard: {
    width: '47.5%',
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
  cardLabel: { color: Colors.white, fontSize: FontSize.body, fontWeight: FontWeight.medium },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  currency: { fontSize: FontSize.h3, fontWeight: FontWeight.bold, marginBottom: 4 },
  amountInput: { flex: 1, marginBottom: 0 },
});
