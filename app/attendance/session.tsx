import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { attendanceApi, AttendanceQrResponse } from '../../src/api/attendance';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';

const LEADERS = ['PASTOR', 'ELDER', 'MANAGER'];

export default function AttendanceSessionScreen() {
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();

  const isLeader = role ? LEADERS.includes(role) : false;

  const {
    mutate: generate,
    data: session,
    isPending,
    error,
  } = useMutation<AttendanceQrResponse>({
    mutationFn: () => attendanceApi.generateQr(),
    onSuccess: () => haptics.success(),
    onError: () => haptics.error(),
  });

  if (!isLeader) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={Gradients.veil} style={StyleSheet.absoluteFill} />
        <View style={[styles.centerWrap, { paddingTop: insets.top + 32 }]}>
          <Text style={styles.infoTitle}>Leaders only</Text>
          <Text style={styles.infoBody}>
            Only a Pastor, Elder, or Manager can start a check-in session.
          </Text>
          <KlinkButton label="Go Back" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={Gradients.veil} style={StyleSheet.absoluteFill} />

      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>QR Check-In Session</Text>
        <Text style={styles.sub}>
          Display this code at the entrance. Members scan it from the Attendance screen to mark
          themselves present.
        </Text>

        {session ? (
          <ScrollReveal delay={100}>
            <View style={styles.qrCard}>
              <Text style={styles.serviceName}>{session.serviceName}</Text>
              <Text style={styles.serviceDate}>{String(session.serviceDate)}</Text>
              <View style={styles.qrWrap}>
                <QRCode
                  value={session.qrPayload}
                  size={240}
                  color={Colors.navy}
                  backgroundColor={Colors.white}
                />
              </View>
              <Text style={styles.qrHint}>Keep this screen open while members check in</Text>
            </View>
          </ScrollReveal>
        ) : (
          <View style={styles.centerWrap}>
            {isPending ? (
              <ActivityIndicator color={Colors.gold} size="large" />
            ) : (
              <>
                {error ? (
                  <Text style={styles.errorText}>
                    {(error as any)?.friendlyMessage ?? 'Could not start the session. Please try again.'}
                  </Text>
                ) : null}
                <KlinkButton label="Start Session" onPress={() => generate()} />
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: Spacing.pagePadding, gap: Spacing.md },
  closeBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  closeIcon: { color: Colors.white, fontSize: 20 },
  heading: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold },
  sub: { color: Colors.darkMuted, fontSize: FontSize.body, lineHeight: 22 },
  qrCard: {
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  serviceName: { color: Colors.white, fontSize: FontSize.h3, fontWeight: FontWeight.bold },
  serviceDate: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  qrWrap: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginVertical: Spacing.md,
  },
  qrHint: { color: Colors.darkMuted, fontSize: FontSize.caption, textAlign: 'center' },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  infoTitle: { color: Colors.white, fontSize: FontSize.h3, fontWeight: FontWeight.bold },
  infoBody: {
    color: Colors.darkMuted,
    fontSize: FontSize.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  errorText: { color: Colors.red, fontSize: FontSize.small, textAlign: 'center' },
});
