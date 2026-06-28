import React, { useCallback } from 'react';
import { Dimensions, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { KlinkAvatar, RoleBadge } from '../../src/components/common/KlinkAvatar';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { membersApi } from '../../src/api/members';
import { givingApi } from '../../src/api/giving';
import { useAuthStore, useUser } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { formatCurrency, formatDate, formatRole } from '../../src/utils/formatters';

const { width, height } = Dimensions.get('window');
const PHOTO_HEIGHT = height * 0.35;

export default function ProfileScreen() {
  const { theme, isDark } = useTheme();
  const { setPreference } = useThemeStore();
  const user = useUser();
  const { logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  const { data: myPayments } = useQuery({
    queryKey: ['myPayments'],
    queryFn: () => givingApi.getMyPayments({ size: 100 }),
  });

  const totalGiven = myPayments?.content?.reduce((s: number, p: { amount: number }) => s + p.amount, 0) ?? 0;

  const handleLogout = useCallback(async () => {
    haptics.heavy();
    await logout();
    router.replace('/(auth)/login');
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
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile hero with parallax photo effect */}
      <View style={[styles.heroWrap, { height: PHOTO_HEIGHT }]}>
        <LinearGradient
          colors={Gradients.darkWorship}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Gold glow for privileged roles */}
        {glow && (
          <View style={[styles.roleGlow, { shadowColor: glow, backgroundColor: `${glow}15` }]} />
        )}

        <View style={[styles.heroContent, { paddingTop: insets.top + 16 }]}>
          <KlinkAvatar
            name={user?.fullName ?? ''}
            photoUrl={user?.photoUrl}
            size={96}
            style={glow ? { shadowColor: glow, shadowOpacity: 0.6, shadowRadius: 20, elevation: 12 } : undefined}
          />
          <Text style={styles.name}>{user?.fullName}</Text>
          {user?.role && <RoleBadge role={user.role} />}
          {user?.email && <Text style={styles.email}>{user.email}</Text>}
        </View>
      </View>

      {/* Stats row */}
      <ScrollReveal delay={0}>
        <View style={styles.statsRow}>
          <StatItem label="Member since" value="—" />
          <View style={styles.statDivider} />
          <StatItem label="Given this year" value={formatCurrency(totalGiven)} highlight />
          <View style={styles.statDivider} />
          <StatItem label="Category" value={user?.category ?? '—'} />
        </View>
      </ScrollReveal>

      {/* Menu items */}
      <ScrollReveal delay={100}>
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <MenuItem label="Edit profile" onPress={() => {}} theme={theme} />
          <MenuItem label="Giving history" onPress={() => router.push('/giving/history')} theme={theme} />
          <MenuItem label="My projects" onPress={() => router.push('/projects/')} theme={theme} />
          <MenuItem label="Church settings" onPress={() => {}} theme={theme} />
        </View>
      </ScrollReveal>

      <ScrollReveal delay={200}>
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <MenuItem label="Notifications" onPress={() => {}} theme={theme} />
          <View style={styles.switchRow}>
            <Text style={[styles.menuLabel, { color: theme.text }]}>Dark mode</Text>
            <Switch
              value={isDark}
              onValueChange={(v) => setPreference(v ? 'dark' : 'light')}
              trackColor={{ true: Colors.gold, false: Colors.darkSurface }}
            />
          </View>
        </View>
      </ScrollReveal>

      <ScrollReveal delay={300}>
        <View style={styles.logoutWrap}>
          <KlinkButton label="Sign out" variant="danger" onPress={handleLogout} />
        </View>
      </ScrollReveal>
    </ScrollView>
  );
}

function StatItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color: highlight ? Colors.gold : theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
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
  container: { flex: 1 },
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
  logoutWrap: { paddingHorizontal: Spacing.pagePadding, marginTop: Spacing.md },
});
