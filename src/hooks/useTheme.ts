import { useColorScheme } from 'react-native';
import { DarkTheme, LightTheme } from '../theme/colors';
import { useThemeStore } from '../store/themeStore';

// Use a mapped type so light and dark theme values are both valid (no literal type mismatch)
export type Theme = { [K in keyof typeof DarkTheme]: string };

export function useTheme(): { theme: Theme; isDark: boolean } {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((s) => s.preference);
  const isDark = preference === 'system' ? systemScheme === 'dark' : preference === 'dark';
  return { theme: (isDark ? DarkTheme : LightTheme) as Theme, isDark };
}
