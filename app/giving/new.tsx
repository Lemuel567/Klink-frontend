import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useDebounce } from '../../src/hooks/useDebounce';
import { useRole } from '../../src/store/authStore';
import { givingApi } from '../../src/api/giving';
import { membersApi, Member } from '../../src/api/members';

type GivingType = 'TITHE' | 'OFFERING' | 'WELFARE';

const GIVING_TYPES: { key: GivingType; label: string; color: string; desc: string }[] = [
  { key: 'TITHE', label: 'Tithe', color: Colors.gold, desc: '10% of income' },
  { key: 'OFFERING', label: 'Offering', color: Colors.purpleLight ?? Colors.purple, desc: 'A freewill gift' },
  { key: 'WELFARE', label: 'Welfare', color: Colors.green, desc: 'Care for members in need' },
];

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

export default function NewGivingScreen() {
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();

  const [type, setType] = useState<GivingType>('TITHE');
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [date, setDate] = useState(todayIso);
  const [momoRef, setMomoRef] = useState('');

  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Pick<Member, 'id' | 'fullName'> | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const debouncedSearch = useDebounce(memberSearch, 400);

  const needsMember = type === 'TITHE' || type === 'WELFARE';
  const paymentMonth = date.substring(0, 7);

  const { data: memberResults, isFetching: searchingMembers } = useQuery({
    queryKey: ['member-search', debouncedSearch],
    queryFn: () => membersApi.list({ search: debouncedSearch, size: 10 }),
    enabled: showPicker && debouncedSearch.length >= 2,
  });

  // Result generic is widened to `unknown` because welfare returns Payment[]
  // while offering/tithe return a single Payment; the result is not consumed.
  const { mutate: submit, isPending } = useMutation<unknown, unknown, void>({
    mutationFn: () => {
      const parsedAmount = parseFloat(amount);
      if (type === 'OFFERING') {
        return givingApi.recordOffering({ serviceDate: date, amount: parsedAmount });
      }
      if (type === 'TITHE') {
        return givingApi.recordTithe({
          memberId: selectedMember!.id,
          amount: parsedAmount,
          paymentDate: date,
          paymentMonth,
          momoReference: momoRef.trim() || undefined,
        });
      }
      return givingApi.recordWelfare({
        memberId: selectedMember!.id,
        amountPaid: parsedAmount,
        paymentDate: date,
        paymentMonth,
        momoReference: momoRef.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['giving'] });
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      haptics.success();
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Failed to record payment. Please try again.');
      haptics.error();
    },
  });

  const handleSubmit = useCallback(() => {
    setAmountError('');
    const parsedAmount = parseFloat(amount);
    if (!amount.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      setAmountError('Enter a valid amount greater than 0.');
      haptics.error();
      return;
    }
    if (needsMember && !selectedMember) {
      Alert.alert('Select a member', 'Please search and select the member for this payment.');
      haptics.error();
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Invalid date', 'Enter the date as YYYY-MM-DD (e.g. 2026-06-28).');
      haptics.error();
      return;
    }
    submit();
  }, [amount, date, needsMember, selectedMember, submit]);

  const handleSelectMember = (member: Member) => {
    setSelectedMember({ id: member.id, fullName: member.fullName });
    setMemberSearch('');
    setShowPicker(false);
    haptics.light();
  };

  const handleTypeChange = (newType: GivingType) => {
    haptics.light();
    setType(newType);
    setSelectedMember(null);
    setMemberSearch('');
    setShowPicker(false);
  };

  // Non-FinSec: read-only info screen
  if (role !== 'FINANCIAL_SECRETARY') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={Gradients.veil} style={StyleSheet.absoluteFill} />
        <View style={[styles.infoWrap, { paddingTop: insets.top + 32 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.infoIcon}>🙏</Text>
          <Text style={styles.infoHeading}>Your giving matters</Text>
          <Text style={styles.infoBody}>
            Give your tithe, offering, or welfare contribution securely with mobile money or card —
            or speak to your Financial Secretary to record a cash payment.
          </Text>
          <KlinkButton
            label="Give Online with Paystack"
            onPress={() => router.replace('/giving/pay')}
          />
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => router.push('/giving/history')}
            accessibilityRole="button"
            accessibilityLabel="View my giving history"
          >
            <Text style={styles.historyBtnText}>View my giving history</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const selected = GIVING_TYPES.find((t) => t.key === type)!;

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
            <Text style={styles.heading}>Record payment</Text>
            <Text style={styles.sub}>Financial Secretary — record a member's contribution</Text>
          </View>

          {/* Type selector */}
          <ScrollReveal delay={100}>
            <View style={styles.typeGrid}>
              {GIVING_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => handleTypeChange(t.key)}
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

          <ScrollReveal delay={200}>
            <View style={styles.card}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />

              {/* Member picker — TITHE and WELFARE only */}
              {needsMember && (
                <View style={styles.memberSection}>
                  <Text style={styles.cardLabel}>Member *</Text>
                  {selectedMember ? (
                    <TouchableOpacity
                      style={styles.selectedMember}
                      onPress={() => {
                        setSelectedMember(null);
                        setShowPicker(true);
                        haptics.light();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Selected: ${selectedMember.fullName}. Tap to change.`}
                    >
                      <Text style={styles.selectedMemberName}>{selectedMember.fullName}</Text>
                      <Text style={styles.changeText}>Change</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <KlinkInput
                        label="Search by name..."
                        value={memberSearch}
                        onChangeText={(v) => {
                          setMemberSearch(v);
                          setShowPicker(true);
                        }}
                        autoCapitalize="words"
                        containerStyle={{ marginBottom: 0 }}
                      />
                      {showPicker && (
                        <View style={styles.pickerList}>
                          {searchingMembers && (
                            <ActivityIndicator color={Colors.gold} style={styles.pickerSpinner} />
                          )}
                          {!searchingMembers && debouncedSearch.length < 2 && (
                            <Text style={styles.pickerHint}>Type at least 2 characters to search</Text>
                          )}
                          {!searchingMembers &&
                            debouncedSearch.length >= 2 &&
                            (memberResults?.content?.length ?? 0) === 0 && (
                              <Text style={styles.pickerHint}>No members found</Text>
                            )}
                          {(memberResults?.content ?? []).map((m: Member) => (
                            <TouchableOpacity
                              key={m.id}
                              onPress={() => handleSelectMember(m)}
                              style={styles.pickerItem}
                              accessibilityRole="button"
                              accessibilityLabel={m.fullName}
                            >
                              <Text style={styles.pickerItemName}>{m.fullName}</Text>
                              <Text style={styles.pickerItemRole}>
                                {m.role.replace(/_/g, ' ')}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}

              {/* Amount */}
              <Text style={styles.cardLabel}>{selected.label} amount (GHS) *</Text>
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
              {amountError ? <Text style={styles.fieldError}>{amountError}</Text> : null}

              {/* Date */}
              <KlinkInput
                label="Date (YYYY-MM-DD)"
                value={date}
                onChangeText={setDate}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
              />

              {/* MoMo reference — TITHE and WELFARE only */}
              {needsMember && (
                <KlinkInput
                  label="MoMo / Cheque reference (optional)"
                  value={momoRef}
                  onChangeText={setMomoRef}
                  autoCapitalize="none"
                />
              )}

              <KlinkButton
                label={`Record ${selected.label}`}
                onPress={handleSubmit}
                disabled={!amount.trim() || isPending}
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
  memberSection: { gap: Spacing.sm },
  cardLabel: { color: Colors.white, fontSize: FontSize.body, fontWeight: FontWeight.medium },
  selectedMember: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(244,164,41,0.15)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gold,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  selectedMemberName: {
    color: Colors.white,
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
  changeText: { color: Colors.gold, fontSize: FontSize.small },
  pickerList: {
    backgroundColor: 'rgba(26,31,62,0.98)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    maxHeight: 200,
  },
  pickerSpinner: { padding: Spacing.md },
  pickerHint: {
    color: Colors.darkMuted,
    fontSize: FontSize.small,
    padding: Spacing.md,
    textAlign: 'center',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    minHeight: 44,
  },
  pickerItemName: {
    color: Colors.white,
    fontSize: FontSize.small,
    fontWeight: FontWeight.medium,
  },
  pickerItemRole: { color: Colors.darkMuted, fontSize: FontSize.caption },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  currency: { fontSize: FontSize.h3, fontWeight: FontWeight.bold, marginBottom: 4 },
  amountInput: { flex: 1, marginBottom: 0 },
  fieldError: { color: Colors.red, fontSize: FontSize.caption, marginTop: -8 },
  // Non-FinSec info view
  infoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  infoIcon: { fontSize: 48, marginBottom: Spacing.md },
  infoHeading: {
    color: Colors.white,
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  infoBody: {
    color: Colors.darkMuted,
    fontSize: FontSize.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  historyBtn: {
    marginTop: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  historyBtnText: {
    color: Colors.gold,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semiBold,
  },
});
