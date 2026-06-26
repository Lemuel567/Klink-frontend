import { useColorScheme } from 'react-native';
import { DarkTheme, LightTheme } from '../theme/colors';

export type Theme = typeof DarkTheme;

export function useTheme(): { theme: Theme; isDark: boolean } {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { theme: isDark ? DarkTheme : LightTheme, isDark };
}
