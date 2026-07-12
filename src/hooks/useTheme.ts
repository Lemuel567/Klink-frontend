import { DarkTheme } from '../theme/colors';

// Klink is DARK-MODE ONLY (2026-07-12): the full-bleed rotating worship photos
// with translucent glass surfaces are the app's visual identity (the login-page
// look, applied everywhere). Light mode was removed deliberately — do not
// reintroduce useColorScheme/themeStore switching here.
export type Theme = Omit<{ [K in keyof typeof DarkTheme]: string }, 'backgroundGradient'> & {
  backgroundGradient: readonly [string, string, string];
};

export function useTheme(): { theme: Theme; isDark: boolean } {
  return { theme: DarkTheme as Theme, isDark: true };
}
