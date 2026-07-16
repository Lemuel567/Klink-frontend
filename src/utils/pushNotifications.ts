import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { membersApi } from '../api/members';
import { useNotificationStore } from '../store/notificationStore';

// ─── Push notification receipt ────────────────────────────────────────────────
// The backend (firebase-admin) sends FCM pushes to Member.fcmToken — this module
// obtains the device token and registers it via PUT /members/me/fcm-token.
//
// IMPORTANT: remote push does NOT run in Expo Go (SDK 53+ removed it) — a dev
// build (eas build --profile development) is required. In Expo Go every function
// here degrades to a silent no-op so nothing crashes during development.
//
// Android: getDevicePushTokenAsync() returns the FCM registration token directly
// (needs google-services.json in the dev build). iOS: it returns the raw APNs
// token; full iOS delivery additionally needs the APNs key uploaded to the
// Firebase console (or @react-native-firebase/messaging) — registering the token
// is still correct and forward-compatible.

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Show notifications while the app is foregrounded (banner + sound, no badge spam)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let registeredToken: string | null = null;
let receivedSub: Notifications.EventSubscription | null = null;

/**
 * Ask permission, fetch the device push token, and register it with the backend.
 * Safe to call on every login — it early-returns in Expo Go, on simulators, on
 * permission denial, and when the token is already registered.
 */
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (isExpoGo) {
      console.log('[Push] Expo Go detected — remote push needs a dev build; skipping registration');
      return;
    }
    if (!Device.isDevice) {
      console.log('[Push] Simulator/emulator — skipping push registration');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Church notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F4A429',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') {
      console.log('[Push] Permission not granted — skipping registration');
      return;
    }

    const { data: token } = await Notifications.getDevicePushTokenAsync();
    const tokenStr = typeof token === 'string' ? token : JSON.stringify(token);
    if (!tokenStr || tokenStr === registeredToken) return;

    await membersApi.registerFcmToken(tokenStr);
    registeredToken = tokenStr;
    useNotificationStore.getState().setFcmToken(tokenStr);
    console.log('[Push] Device token registered with backend');
  } catch (e: any) {
    // Never let push setup break login — log and move on
    console.log('[Push] Registration failed:', e?.message ?? e);
  }
}

/**
 * Feed foreground notifications into the in-app inbox (notificationStore).
 * Idempotent — a second call replaces the previous listener.
 */
export function startPushListeners(): void {
  if (isExpoGo) return;
  receivedSub?.remove();
  receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    const { title, body } = notification.request.content;
    if (title || body) {
      useNotificationStore.getState().addNotification({
        title: title ?? 'Klink',
        body: body ?? '',
        type: 'info',
      });
    }
  });
}

/** Remove the backend token on logout so a signed-out device stops receiving pushes. */
export async function unregisterPushNotifications(): Promise<void> {
  try {
    receivedSub?.remove();
    receivedSub = null;
    if (registeredToken) {
      await membersApi.removeFcmToken().catch(() => {});
      registeredToken = null;
    }
  } catch {
    // non-fatal
  }
}
