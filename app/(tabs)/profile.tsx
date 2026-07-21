import React, { useCallback, useState } from 'react';
import { Alert, Dimensions, ScrollView, Share, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { KlinkAvatar, RoleBadge } from '../../src/components/common/KlinkAvatar';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { KlinkToast } from '../../src/components/common/KlinkToast';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { membersApi } from '../../src/api/members';
import { givingApi } from '../../src/api/giving';
import { churchApi } from '../../src/api/church';
import { confirmAction } from '../../src/utils/confirmDelete';
import { useAuthStore, useUser } from '../../src/store/authStore';
import { useSoundStore } from '../../src/store/soundStore';
import { soundManager } from '../../src/utils/soundManager';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { formatCurrency, formatDate, formatRole } from '../../src/utils/formatters';

const { width, height } = Dimensions.get('window');
const PHOTO_HEIGHT = height * 0.35;

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { musicEnabled, setMusicEnabled } = useSoundStore();
  const user = useUser();
  const { logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const { data: myPayments } = useQuery({
    queryKey: ['myPayments'],
    queryFn: () => givingApi.getMyPayments({ size: 100 }),
  });

  // Full member record: fills createdAt ("Member since") plus email/photo for
  // sessions stored before AuthResponse carried those fields.
  const { data: myRecord } = useQuery({
    queryKey: ['member', user?.id],
    queryFn: () => membersApi.get(user!.id),
    enabled: !!user?.id,
  });

  // Church code — leadership needs it to invite new members
  const queryClient = useQueryClient();
  const isLeadership = ['PASTOR', 'ELDER', 'MANAGER'].includes(user?.role ?? '');
  const canRegenerate = ['PASTOR', 'ELDER'].includes(user?.role ?? '');
  const { data: church } = useQuery({
    queryKey: ['church-settings'],
    queryFn: () => churchApi.getSettings(),
    enabled: isLeadership,
  });

  const { mutate: regenerateCode, isPending: regenerating } = useMutation({
    mutationFn: () => churchApi.regenerateCode(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['church-settings'] });
      haptics.success();
      setToast({ message: 'New church code generated', type: 'success' });
    },
    onError: () => {
      haptics.heavy();
      setToast({ message: 'Could not regenerate the code', type: 'info' });
    },
  });

  const handleCopyCode = async () => {
    if (!church?.churchCode) return;
    haptics.light();
    await Clipboard.setStringAsync(church.churchCode);
    setToast({ message: 'Church code copied', type: 'success' });
  };

  const handleShareCode = async () => {
    if (!church?.churchCode) return;
    haptics.light();
    try {
      await Share.share({
        message: `Join ${church.churchName ?? 'my church'} on Klink! Use church code: ${church.churchCode}`,
      });
    } catch {
      // user dismissed the share sheet
    }
  };

  const handleRegenerate = () => {
    haptics.medium();
    confirmAction({
      title: 'Regenerate church code?',
      message:
        'Current members keep their access, but anyone joining from now on will need the NEW code. The old code stops working immediately.',
      confirmLabel: 'Regenerate',
      onConfirm: () => regenerateCode(),
    });
  };

  // "Given this year" previously summed ALL records under a yearly label.
  const currentYear = String(new Date().getFullYear());
  const totalGiven =
    myPayments?.content
      ?.filter((p: { paymentDate?: string }) => (p.paymentDate ?? '').startsWith(currentYear))
      .reduce((s: number, p: { amount: number }) => s + p.amount, 0) ?? 0;

  // Signing out is easy to hit by accident at the bottom of a scroll — confirm first
  const handleLogout = useCallback(() => {
    haptics.medium();
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          haptics.heavy();
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }, []);

  // A member removes THEMSELVES from the church — destructive and double-confirmed.
  // Backend deactivates the account and kills every session; leadership can
  // reactivate them if they ever return.
  const handleLeaveChurch = useCallback(() => {
    haptics.medium();
    Alert.alert(
      'Leave this church?',
      'Your account will be deactivated and you will lose access immediately. Church leadership can restore you if you return.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you sure?', 'This signs you out of every device.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Leave church',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await membersApi.leaveChurch();
                    haptics.success();
                    await logout();
                    router.replace('/(auth)/login');
                  } catch (e: any) {
                    haptics.error();
                    Alert.alert('Could not leave', e?.friendlyMessage ?? 'Please try again.');
                  }
                },
              },
            ]),
        },
      ],
    );
  }, []);

  // Role glow mapping
  const roleGlow: Record<string, string> = {
    PASTOR: Colors.gold,
    ELDER: Colors.roseGold,
    MANAGER: Colors.blue,
    FINANCIAL_SECRETARY: Colors.green,
  };
  const glow = roleGlow[user?.role ?? ''];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
    <ScrollView
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile hero — transparent: the global rotating worship photo shows
          through (login-page look), with only a light graduated veil for text */}
      <View style={[styles.heroWrap, { height: PHOTO_HEIGHT }]}>
        <LinearGradient
          colors={['rgba(10,5,32,0.15)', 'rgba(10,5,32,0.35)', 'rgba(10,5,32,0.7)']}
          style={StyleSheet.absoluteFill}
        />

        {/* Gold glow for privileged roles */}
        {glow && (
          <View style={[styles.roleGlow, { shadowColor: glow, backgroundColor: `${glow}15` }]} />
        )}

        <View style={[styles.heroContent, { paddingTop: insets.top + 16 }]}>
          <KlinkAvatar
            name={user?.fullName ?? ''}
            photoUrl={user?.photoUrl ?? myRecord?.photoUrl}
            size={96}
            style={glow ? { shadowColor: glow, shadowOpacity: 0.6, shadowRadius: 20, elevation: 12 } : undefined}
          />
          <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
            {user?.fullName}
          </Text>
          {user?.role && <RoleBadge role={user.role} />}
          {(user?.email ?? myRecord?.email) && (
            <Text style={styles.email} numberOfLines={1}>{user?.email ?? myRecord?.email}</Text>
          )}
        </View>
      </View>

      {/* Stats row */}
      <ScrollReveal delay={0}>
        <View style={styles.statsRow}>
          <StatItem
            label="Member since"
            value={myRecord?.createdAt ? formatDate(myRecord.createdAt) : '—'}
          />
          <View style={styles.statDivider} />
          <StatItem label="Given this year" value={formatCurrency(totalGiven)} highlight />
          <View style={styles.statDivider} />
          <StatItem label="Category" value={user?.category ?? '—'} />
        </View>
      </ScrollReveal>

      {/* Church code — how new members join; leadership only */}
      {isLeadership && church?.churchCode && (
        <ScrollReveal delay={60}>
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>CHURCH CODE</Text>
            <Text style={styles.codeValue} accessibilityLabel={`Church code ${church.churchCode}`}>
              {church.churchCode}
            </Text>
            <Text style={[styles.codeHint, { color: theme.textMuted }]}>
              New members enter this code to join {church.churchName ?? 'your church'}
            </Text>
            <View style={styles.codeActions}>
              <TouchableOpacity
                onPress={handleCopyCode}
                style={styles.codeBtn}
                accessibilityRole="button"
                accessibilityLabel="Copy church code"
              >
                <Text style={styles.codeBtnText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleShareCode}
                style={styles.codeBtn}
                accessibilityRole="button"
                accessibilityLabel="Share church code"
              >
                <Text style={styles.codeBtnText}>Share</Text>
              </TouchableOpacity>
              {canRegenerate && (
                <TouchableOpacity
                  onPress={handleRegenerate}
                  disabled={regenerating}
                  style={[styles.codeBtn, styles.codeBtnDanger]}
                  accessibilityRole="button"
                  accessibilityLabel="Regenerate church code"
                >
                  <Text style={styles.codeBtnDangerText}>
                    {regenerating ? 'Working…' : 'Regenerate'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollReveal>
      )}

      {/* Account menu — features moved OUT of Profile (2026-07-16 IA overhaul):
          personal records live on the Home stat cards, church features on the
          Home quick grid and the Church tab grid. Profile is account-only. */}
      <ScrollReveal delay={100}>
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <MenuItem label="Edit profile" onPress={() => router.push('/profile/edit')} theme={theme} />
          <MenuItem label="Change password" onPress={() => router.push('/profile/change-password')} theme={theme} />
          <MenuItem label="Church settings" onPress={() => router.push('/church/settings')} theme={theme} />
        </View>
      </ScrollReveal>

      <ScrollReveal delay={200}>
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <MenuItem label="Notifications" onPress={() => router.push('/notifications')} theme={theme} />
          {/* Dark-mode toggle removed 2026-07-12 — Klink is dark-only by design */}
          <View style={styles.switchRow}>
            <View style={styles.musicLabelWrap}>
              <View style={[styles.musicIcon, { backgroundColor: musicEnabled ? 'rgba(244,164,41,0.15)' : 'rgba(139,143,168,0.15)' }]}>
                <Text style={[styles.musicNote, { color: musicEnabled ? Colors.gold : Colors.darkMuted }]}>♪</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuLabel, { color: theme.text }]} numberOfLines={1}>Worship Music</Text>
                <Text style={[styles.musicSubtitle, { color: theme.textMuted }]} numberOfLines={2}>
                  Plays across all screens while you use the app
                </Text>
              </View>
            </View>
            <Switch
              value={musicEnabled}
              onValueChange={(enabled) => {
                haptics.light();
                setMusicEnabled(enabled);
                if (enabled) {
                  soundManager.playBackgroundMusic().catch(() => {});
                  setToast({ message: 'Worship music on', type: 'success' });
                } else {
                  soundManager.stopBackgroundMusic().catch(() => {});
                  setToast({ message: 'Worship music off', type: 'info' });
                }
              }}
              trackColor={{ true: Colors.gold, false: Colors.darkSurface }}
            />
          </View>
        </View>
      </ScrollReveal>

      <ScrollReveal delay={300}>
        <View style={styles.logoutWrap}>
          <KlinkButton label="Sign out" variant="danger" onPress={handleLogout} />
          <TouchableOpacity
            onPress={handleLeaveChurch}
            style={styles.leaveChurchBtn}
            accessibilityRole="button"
            accessibilityLabel="Leave this church"
          >
            <Text style={styles.leaveChurchText}>Leave this church</Text>
          </TouchableOpacity>
        </View>
      </ScrollReveal>
    </ScrollView>

    {toast && (
      <KlinkToast
        message={toast.message}
        type={toast.type}
        visible
        onHide={() => setToast(null)}
      />
    )}
    </View>
  );
}

function StatItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={styles.statItem}>
      <Text
        style={[styles.statValue, { color: highlight ? Colors.gold : theme.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: theme.textMuted }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function MenuItem({ label, onPress, theme }: { label: string; onPress: () => void; theme: any }) {
  const haptics = useHaptics();
  return (
    <TouchableOpacity
      onPress={() => { haptics.light(); onPress(); }}
      style={styles.menuItem}
      accessibilityRole="button"
    >
      <Text style={[styles.menuLabel, { color: theme.text }]}>{label}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 18 }}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  heroWrap: { position: 'relative', overflow: 'hidden' },
  roleGlow: {
    position: 'absolute',
    top: '20%',
    alignSelf: 'center',
    width: 200,
    height: 200,
    borderRadius: 100,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 20,
  },
  heroContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  name: {
    color: Colors.white,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    maxWidth: '100%',
  },
  email: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.small },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.pagePadding,
    gap: 0,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: FontSize.body, fontWeight: FontWeight.bold },
  statLabel: { fontSize: FontSize.caption, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 4 },
  codeCard: {
    marginHorizontal: Spacing.pagePadding,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: Colors.gold,
    backgroundColor: 'rgba(244,164,41,0.08)',
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 6,
  },
  codeLabel: {
    color: Colors.gold,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    letterSpacing: 3,
  },
  codeValue: {
    color: Colors.gold,
    fontSize: 40,
    fontWeight: FontWeight.bold,
    letterSpacing: 6,
    textAlign: 'center',
    maxWidth: '100%',
  },
  codeHint: { fontSize: FontSize.caption, textAlign: 'center' },
  codeActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  codeBtn: {
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  codeBtnText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.bold },
  codeBtnDanger: { borderColor: 'rgba(220,38,38,0.6)' },
  codeBtnDangerText: { color: Colors.red, fontSize: FontSize.small, fontWeight: FontWeight.bold },
  section: {
    marginHorizontal: Spacing.pagePadding,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  menuLabel: { fontSize: FontSize.body },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 52,
  },
  logoutWrap: { paddingHorizontal: Spacing.pagePadding, marginTop: Spacing.md, gap: Spacing.sm },
  leaveChurchBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  leaveChurchText: {
    color: 'rgba(220,38,38,0.85)',
    fontSize: FontSize.small,
    fontWeight: FontWeight.semiBold,
    textDecorationLine: 'underline',
  },
  musicLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  musicIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicNote: {
    fontSize: 18,
    lineHeight: 22,
  },
  musicSubtitle: {
    fontSize: FontSize.caption,
    marginTop: 1,
  },
});
