import React, { useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { ParticleSystem } from '../../src/components/animations/ParticleSystem';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { attendanceApi } from '../../src/api/attendance';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useHaptics } from '../../src/hooks/useHaptics';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const FRAME_SIZE = Math.min(SCREEN_W * 0.7, 280);

export default function ScanAttendanceScreen() {
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();

  const [checkedIn, setCheckedIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // Guards against the camera firing multiple scan events for one code
  const scannedRef = useRef(false);

  const { mutate: scan } = useMutation({
    mutationFn: (qrPayload: string) => attendanceApi.scan(qrPayload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-me'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-all'] });
      haptics.success();
      setCheckedIn(true);
      setTimeout(() => router.back(), 2500);
    },
    onError: (err: any) => {
      haptics.error();
      const msg =
        err?.response?.status === 409
          ? 'You are already checked in for this service. 🙌'
          : err?.friendlyMessage ?? 'Could not check you in. Please try again.';
      setErrorMsg(msg);
      // allow another attempt after a short pause
      setTimeout(() => {
        scannedRef.current = false;
        setErrorMsg('');
      }, 2500);
    },
  });

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scannedRef.current || checkedIn) return;
    scannedRef.current = true;
    haptics.medium();
    scan(data);
  };

  // Permission not yet answered
  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={Gradients.veil} style={StyleSheet.absoluteFill} />
        <View style={[styles.permissionWrap, { paddingTop: insets.top + 32 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionBody}>
            Klink uses your camera only to scan the church check-in QR code.
          </Text>
          <KlinkButton label="Allow Camera" onPress={requestPermission} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={checkedIn ? undefined : handleBarcodeScanned}
      />

      {/* Dark vignette + scan frame */}
      <View style={styles.overlay} pointerEvents="box-none">
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeBtn, { marginTop: insets.top + 8, marginLeft: Spacing.pagePadding }]}
          accessibilityRole="button"
          accessibilityLabel="Close scanner"
        >
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>

        <View style={styles.frameWrap}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.hint}>
            {errorMsg || 'Point your camera at the check-in QR code'}
          </Text>
        </View>
      </View>

      {/* Success celebration */}
      {checkedIn && (
        <Animated.View entering={FadeIn.duration(250)} style={styles.successOverlay} pointerEvents="none">
          <ParticleSystem
            count={40}
            colors={['rgba(244,164,41,0.9)', 'rgba(107,63,160,0.8)', 'rgba(255,255,255,0.8)']}
            containerWidth={SCREEN_W}
            containerHeight={SCREEN_H}
            style={StyleSheet.absoluteFill as any}
          />
          <Animated.View entering={ZoomIn.springify().damping(10)} style={styles.checkCircle}>
            <Text style={styles.checkMark}>✓</Text>
          </Animated.View>
          <Animated.Text entering={FadeIn.delay(300)} style={styles.successText}>
            You are checked in!
          </Animated.Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  overlay: { ...StyleSheet.absoluteFillObject },
  closeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 22,
  },
  closeIcon: { color: Colors.white, fontSize: 20 },
  frameWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: Colors.gold,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
  hint: {
    color: Colors.white,
    fontSize: FontSize.body,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.full,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  permissionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  permissionIcon: { fontSize: 48 },
  permissionTitle: { color: Colors.white, fontSize: FontSize.h3, fontWeight: FontWeight.bold },
  permissionBody: {
    color: Colors.darkMuted,
    fontSize: FontSize.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,15,46,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  checkCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: Colors.white, fontSize: 56, fontWeight: FontWeight.bold },
  successText: { color: Colors.white, fontSize: FontSize.h3, fontWeight: FontWeight.bold },
});
