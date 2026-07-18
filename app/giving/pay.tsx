import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { ParticleSystem } from '../../src/components/animations/ParticleSystem';
import { HandsRaised } from '../../src/components/worship';
import { paymentsApi, OnlinePayment, OnlinePaymentType, paymentTypeLabel } from '../../src/api/payments';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useHaptics } from '../../src/hooks/useHaptics';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Premium giving-type cards — each with its own gradient, icon, and one-line
// label/sub (100×120, horizontal snap scroll with a peek of the next card).
// Photo-backed type cards (2026-07-18): each giving type carries a real worship
// photo under a dark scrim — same design language as the church-hub tiles.
import { Image as ExpoImage } from 'expo-image';
import { WorshipImages } from '../../src/utils/worshipImages';

const TYPE_PHOTOS: Record<string, any> = {
  TITHE: WorshipImages.worshipSolo1,
  OFFERING: WorshipImages.congregation1,
  WELFARE: WorshipImages.prayer1,
  SPECIAL_CONTRIBUTION: WorshipImages.worshipHands4,
  BUILDING_FUND: WorshipImages.churchInterior1,
  MISSIONS: WorshipImages.praiseNature1,
};

const GIVE_TYPES: {
  key: OnlinePaymentType;
  label: string;
  sub: string;
  gradient: readonly [string, string];
  color: string;
  icon: string;       // 24×24 SVG path (stroke style)
  iconGold?: boolean; // gold icon instead of white
}[] = [
  {
    key: 'TITHE', label: 'Tithe', sub: '10% of income',
    gradient: ['#2D1B69', '#6B3FA0'], color: Colors.gold, iconGold: true,
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v10 M9.5 9.5c0-.8 1.1-1.5 2.5-1.5s2.5.7 2.5 1.5-1.1 1.5-2.5 1.5-2.5.7-2.5 1.5 1.1 1.5 2.5 1.5 2.5-.7 2.5-1.5',
  },
  {
    key: 'OFFERING', label: 'Offering', sub: 'Free will',
    gradient: ['#854F0B', '#C67A1A'], color: '#C67A1A',
    icon: 'M20 12v9H4v-9 M2 7h20v5H2z M12 21V7 M12 7s-2-4-5-4-3 4 0 4h5 M12 7s2-4 5-4 3 4 0 4h-5',
  },
  {
    key: 'WELFARE', label: 'Welfare', sub: 'Help others',
    gradient: ['#085041', '#1D9E75'], color: '#1D9E75',
    icon: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z',
  },
  {
    key: 'OTHER', label: 'Special', sub: 'Special gift',
    gradient: ['#0C447C', '#185FA5'], color: '#4A90D9', iconGold: true,
    icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  },
  {
    key: 'BUILDING_FUND', label: 'Building', sub: 'Fund',
    gradient: ['#4A1528', '#C9797A'], color: Colors.roseGold,
    icon: 'M3 21h18 M5 21V7l7-4 7 4v14 M9 9h1 M9 12h1 M9 15h1 M14 9h1 M14 12h1 M14 15h1',
  },
  {
    key: 'MISSIONS', label: 'Missions', sub: 'Global reach',
    gradient: ['#412402', '#854F0B'], color: '#C67A1A',
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c2.5 2.4 4 5.6 4 9s-1.5 6.6-4 9c-2.5-2.4-4-5.6-4-9s1.5-6.6 4-9z',
  },
];

const TYPE_CARD_W = 150;
const TYPE_CARD_GAP = 10;

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 50000;
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 15; // ~30 seconds

type Phase = 'form' | 'paying' | 'verifying' | 'success' | 'failed';

// Optional params: projectId + projectTitle lock the payment to a project contribution.
// memberId + memberName (FinSec only): initiate the payment ON BEHALF OF that member —
// the transaction, ledger record and receipt all credit them, not the FinSec.
type PayParams = { projectId?: string; projectTitle?: string; memberId?: string; memberName?: string };

export default function PayScreen() {
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<PayParams>();

  const isProject = Boolean(params.projectId);
  const onBehalfOf = Boolean(params.memberId); // FinSec initiating for a member

  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [type, setType] = useState<OnlinePaymentType>(isProject ? 'PROJECT_CONTRIBUTION' : 'TITHE');
  const [typePage, setTypePage] = useState(0);
  const [phase, setPhase] = useState<Phase>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [completed, setCompleted] = useState<OnlinePayment | null>(null);
  const referenceRef = useRef<string | null>(null);

  const parsedAmount = parseFloat(amount);
  const amountValid = !isNaN(parsedAmount) && parsedAmount >= MIN_AMOUNT && parsedAmount <= MAX_AMOUNT;

  const invalidateGiving = () => {
    queryClient.invalidateQueries({ queryKey: ['payments-history'] });
    queryClient.invalidateQueries({ queryKey: ['payments-summary'] });
    queryClient.invalidateQueries({ queryKey: ['giving'] });
    queryClient.invalidateQueries({ queryKey: ['myPayments'] });
    if (isProject) {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', params.projectId] });
    }
  };

  const pollForResult = useCallback(async (reference: string) => {
    setPhase('verifying');
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      try {
        const payment = await paymentsApi.verify(reference);
        if (payment.status === 'SUCCESS') {
          setCompleted(payment);
          setPhase('success');
          invalidateGiving();
          haptics.success();
          return;
        }
        if (payment.status === 'FAILED' || payment.status === 'ABANDONED') {
          setErrorMsg(
            payment.status === 'FAILED'
              ? 'The payment was not successful. No money was taken.'
              : 'The payment was not completed.',
          );
          setPhase('failed');
          haptics.error();
          return;
        }
      } catch {
        // transient error — keep polling
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    setErrorMsg("We couldn't confirm the payment yet. If you completed it, it will appear in your history shortly.");
    setPhase('failed');
    haptics.error();
  }, []);

  const handlePay = useCallback(async () => {
    setAmountError('');
    setErrorMsg('');
    if (!amountValid) {
      setAmountError(
        parsedAmount > MAX_AMOUNT
          ? 'Maximum is GHS 50,000 per transaction.'
          : 'Enter an amount of at least GHS 1.00.',
      );
      haptics.error();
      return;
    }

    try {
      setPhase('paying');
      haptics.medium();
      const init = await paymentsApi.initiate({
        amount: parsedAmount,
        paymentType: isProject ? 'PROJECT_CONTRIBUTION' : type,
        description: isProject ? `Contribution to ${params.projectTitle ?? 'project'}` : undefined,
        projectId: params.projectId || undefined,
        memberId: params.memberId || undefined, // backend accepts this from FinSec only
      });
      referenceRef.current = init.reference;

      // Member completes payment on Paystack's secure page
      await WebBrowser.openBrowserAsync(init.authorizationUrl);

      // Browser closed — confirm the result with the backend
      await pollForResult(init.reference);
    } catch (err: any) {
      setErrorMsg(err?.friendlyMessage ?? 'Could not start the payment. Please try again.');
      setPhase('failed');
      haptics.error();
    }
  }, [amountValid, parsedAmount, type, isProject, params.projectId, params.projectTitle, pollForResult]);

  const retry = () => {
    if (referenceRef.current && phase === 'failed' && errorMsg.startsWith("We couldn't confirm")) {
      // payment may have gone through — re-check rather than charge again
      pollForResult(referenceRef.current);
    } else {
      setPhase('form');
      setErrorMsg('');
    }
  };

  const selected = GIVE_TYPES.find((t) => t.key === type);
  const accentColor = isProject ? Colors.gold : selected?.color ?? Colors.gold;

  return (
    <View style={styles.container}>
      <LinearGradient colors={Gradients.veil} style={StyleSheet.absoluteFill} />
      <View style={styles.heroArt} pointerEvents="none">
        <HandsRaised width={SCREEN_W} height={180} />
      </View>

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
            <Text style={styles.heading}>
              {isProject
                ? `Give to ${params.projectTitle ?? 'this project'}`
                : onBehalfOf
                  ? `Payment for ${params.memberName ?? 'member'}`
                  : 'Give online'}
            </Text>
            {onBehalfOf && (
              <Text style={styles.onBehalfNote}>
                Initiated by you as Financial Secretary — the giving record and receipt
                will credit {params.memberName ?? 'the member'}.
              </Text>
            )}
            <Text style={styles.sub}>
              "Each of you should give what you have decided in your heart to give." — 2 Cor 9:7
            </Text>
          </View>

          {/* Amount */}
          <ScrollReveal delay={100}>
            <View style={styles.card}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />

              <View>
                <Text style={styles.fieldLabel}>AMOUNT (GHS)</Text>
                <View style={[styles.amountBox, { borderColor: `${accentColor}66` }]}>
                  <Text style={[styles.currency, { color: accentColor }]}>GHS</Text>
                  <TextInput
                    style={styles.amountField}
                    placeholder="0.00"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                    accessibilityLabel="Amount in Ghana cedis"
                  />
                </View>
                {amountError ? <Text style={styles.amountErr}>{amountError}</Text> : null}
              </View>
              {!isProject && <Text style={styles.fieldLabel}>GIVE TO</Text>}

              {/* Type selector (hidden for project contributions) — horizontal snap cards */}
              {!isProject && (
                <View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={TYPE_CARD_W + TYPE_CARD_GAP}
                    decelerationRate="fast"
                    contentContainerStyle={styles.typeRow}
                    onScroll={(e) =>
                      setTypePage(
                        Math.round(e.nativeEvent.contentOffset.x / (TYPE_CARD_W + TYPE_CARD_GAP)),
                      )
                    }
                    scrollEventThrottle={32}
                  >
                    {GIVE_TYPES.map((t) => {
                      const selectedType = type === t.key;
                      return (
                        <TouchableOpacity
                          key={t.key}
                          activeOpacity={0.85}
                          onPress={() => { haptics.light(); setType(t.key); }}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selectedType }}
                          accessibilityLabel={`${t.label}: ${t.sub}`}
                          style={[
                            styles.typeCardShadow,
                            { shadowColor: t.gradient[0] },
                            selectedType && styles.typeCardSelectedGlow,
                          ]}
                        >
                          <View
                            style={[
                              styles.typeCard,
                              { overflow: 'hidden' },
                              selectedType && styles.typeCardSelected,
                            ]}
                          >
                            <ExpoImage
                              source={TYPE_PHOTOS[t.key]}
                              style={StyleSheet.absoluteFill}
                              contentFit="cover"
                              cachePolicy="memory-disk"
                            />
                            <LinearGradient
                              colors={['rgba(10,5,32,0.15)', 'rgba(10,5,32,0.5)', 'rgba(10,5,32,0.88)']}
                              style={StyleSheet.absoluteFill}
                            />
                            <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                              <Path
                                d={t.icon}
                                stroke={t.iconGold ? Colors.gold : Colors.white}
                                strokeWidth={1.8}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </Svg>
                            <Text style={styles.typeLabel} numberOfLines={1}>{t.label}</Text>
                            <Text style={styles.typeDesc} numberOfLines={1}>{t.sub}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {/* Page dots */}
                  <View style={styles.dotsRow}>
                    {GIVE_TYPES.map((t, i) => (
                      <View
                        key={t.key}
                        style={[
                          styles.dot,
                          (i === typePage || type === t.key) && styles.dotActive,
                        ]}
                      />
                    ))}
                  </View>
                </View>
              )}

              <KlinkButton
                label={
                  phase === 'paying'
                    ? 'Opening Paystack…'
                    : phase === 'verifying'
                      ? 'Confirming payment…'
                      : `Pay${amountValid ? ` GHS ${parsedAmount.toFixed(2)}` : ''} with Paystack`
                }
                onPress={handlePay}
                disabled={!amount.trim() || phase === 'paying' || phase === 'verifying'}
                loading={phase === 'paying' || phase === 'verifying'}
              />
              <Text style={styles.securedText}>🔒 Secured by Paystack — card &amp; mobile money</Text>

              {phase === 'failed' && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                  <TouchableOpacity
                    onPress={retry}
                    style={styles.retryBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Try again"
                  >
                    <Text style={styles.retryText}>Try again</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollReveal>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success celebration */}
      {phase === 'success' && completed && (
        <Animated.View entering={FadeIn.duration(250)} style={styles.successOverlay}>
          <ParticleSystem
            count={40}
            colors={['rgba(244,164,41,0.9)', 'rgba(255,215,0,0.85)', 'rgba(255,255,255,0.7)']}
            containerWidth={SCREEN_W}
            containerHeight={SCREEN_H}
            style={StyleSheet.absoluteFill as any}
          />
          <Animated.View entering={ZoomIn.springify().damping(10)} style={styles.checkCircle}>
            <Text style={styles.checkMark}>✓</Text>
          </Animated.View>
          <Animated.Text entering={FadeIn.delay(250)} style={styles.successTitle}>
            Payment Successful!
          </Animated.Text>
          <Animated.Text entering={FadeIn.delay(400)} style={styles.successAmount}>
            GHS {Number(completed.amount).toFixed(2)}
          </Animated.Text>
          <Animated.Text entering={FadeIn.delay(500)} style={styles.successMeta}>
            {paymentTypeLabel(completed.paymentType)} · {completed.paystackReference}
          </Animated.Text>
          <Animated.Text entering={FadeIn.delay(650)} style={styles.successThanks}>
            Thank you for your faithfulness 🙏
          </Animated.Text>
          <Animated.Text entering={FadeIn.delay(750)} style={styles.successRecorded}>
            Recorded automatically — it's already in the giving records
          </Animated.Text>
          <Animated.View entering={FadeIn.delay(800)} style={styles.successActions}>
            <KlinkButton label="Done" onPress={() => router.back()} />
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  heroArt: { position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0.18 },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.xxl, gap: Spacing.xl },
  header: { gap: Spacing.sm },
  closeBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  closeIcon: { color: Colors.white, fontSize: 20 },
  heading: {
    color: Colors.white,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.small, fontStyle: 'italic', lineHeight: 20 },
  onBehalfNote: { color: Colors.gold, fontSize: FontSize.caption, lineHeight: 18 },
  card: { borderRadius: BorderRadius.xxl, overflow: 'hidden', padding: Spacing.lg, gap: Spacing.md },
  glassOverlay: {
    borderRadius: BorderRadius.xxl,
    backgroundColor: 'rgba(20,12,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.3)',
  },
  cardLabel: { color: Colors.white, fontSize: FontSize.body, fontWeight: FontWeight.medium },
  fieldLabel: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    minHeight: 64,
    gap: Spacing.sm,
  },
  currency: { fontSize: 20, fontWeight: FontWeight.bold },
  amountField: { flex: 1, color: Colors.white, fontSize: 28, fontWeight: FontWeight.semiBold },
  amountErr: { color: Colors.red, fontSize: FontSize.caption, marginTop: 6 },
  typeRow: {
    gap: TYPE_CARD_GAP,
    paddingRight: 15, // peek of the next card
    paddingVertical: 6,
  },
  typeCardShadow: {
    borderRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  typeCardSelectedGlow: {
    shadowColor: Colors.gold,
    shadowOpacity: 0.6,
    shadowRadius: 14,
  },
  typeCard: {
    width: TYPE_CARD_W,
    height: 156,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  typeCardSelected: {
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  typeLabel: { fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white },
  typeDesc: { fontSize: 10, color: 'rgba(255,255,255,0.75)' },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: { backgroundColor: Colors.gold },
  securedText: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.caption, textAlign: 'center' },
  errorBox: {
    borderWidth: 1,
    borderColor: `${Colors.red}66`,
    backgroundColor: `${Colors.red}15`,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  errorText: { color: Colors.red, fontSize: FontSize.small, lineHeight: 20 },
  retryBtn: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  retryText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.bold },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,15,46,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  checkCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  checkMark: { color: Colors.white, fontSize: 56, fontWeight: FontWeight.bold },
  successTitle: { color: Colors.gold, fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  successAmount: { color: Colors.white, fontSize: 40, fontWeight: FontWeight.bold },
  successMeta: { color: Colors.darkMuted, fontSize: FontSize.caption, textAlign: 'center' },
  successThanks: { color: Colors.white, fontSize: FontSize.body, marginTop: Spacing.sm },
  successRecorded: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.caption, textAlign: 'center' },
  successActions: { marginTop: Spacing.lg, alignSelf: 'stretch' },
});
