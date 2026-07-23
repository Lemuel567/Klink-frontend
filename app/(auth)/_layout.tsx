import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    // contentStyle transparent is LOAD-BEARING: without it this nested Stack
    // paints an opaque navigator background that completely hides the global
    // RotatingBackground — splash/login/onboarding show no photo at all.
    <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="splash" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
