import { useColorScheme } from 'react-native';
import { DarkTheme, LightTheme } from '../theme/colors';

// Use a mapped type so light and dark theme values are both valid (no literal type mismatch)
export type Theme = { [K in keyof typeof DarkTheme]: string };

export function useTheme(): { theme: Theme; isDark: boolean } {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { theme: (isDark ? DarkTheme : LightTheme) as Theme, isDark };
}
