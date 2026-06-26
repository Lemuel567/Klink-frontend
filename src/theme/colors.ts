export const Colors = {
  // Primary palette
  purple: '#2D1B69',
  purpleLight: '#6B3FA0',
  purpleMid: '#4A2580',
  gold: '#F4A429',
  goldBright: '#FFD700',
  goldDim: '#C17D1A',
  white: '#FFFFFF',
  cream: '#FDF8F0',

  // Accent
  roseGold: '#C9797A',
  navy: '#0A0F2E',
  blue: '#4A90D9',
  green: '#2D6A4F',
  red: '#DC2626',

  // Dark mode surfaces
  darkBg: '#0A0F2E',
  darkSurface: '#1A1F3E',
  darkCard: '#252A4A',
  darkBorder: 'rgba(255,255,255,0.1)',
  darkText: '#F5F5F5',
  darkMuted: '#8B8FA8',

  // Transparent
  transparent: 'transparent',

  // Glassmorphism
  glassLight: 'rgba(255,255,255,0.15)',
  glassDark: 'rgba(255,255,255,0.05)',
  glassBorder: 'rgba(255,255,255,0.2)',
  glassStroke: 'rgba(255,255,255,0.08)',

  // Overlays
  overlayDark: 'rgba(0,0,0,0.6)',
  overlayLight: 'rgba(255,255,255,0.1)',
  warmGold: 'rgba(244,164,41,0.2)',
  gradientBottom: 'rgba(0,0,0,0)',
  gradientBottomFull: 'rgba(0,0,0,0.75)',

  // Ripple
  rippleGold: 'rgba(244,164,41,0.3)',
  ripplePurple: 'rgba(45,27,105,0.2)',

  // Skeleton
  skeletonDark: 'rgba(255,255,255,0.08)',
  skeletonLight: 'rgba(0,0,0,0.06)',
  skeletonShimmerDark: 'rgba(255,255,255,0.14)',
  skeletonShimmerLight: 'rgba(0,0,0,0.12)',

  // Semantic
  success: '#22C55E',
  warning: '#F4A429',
  error: '#DC2626',
  info: '#4A90D9',
} as const;

export const Gradients = {
  worship: ['#2D1B69', '#6B3FA0'] as const,
  glory: ['#F4A429', '#FFD700'] as const,
  sunrise: ['#FF6B6B', '#F4A429'] as const,
  heaven: ['#667eea', '#764ba2'] as const,
  darkWorship: ['#0A0F2E', '#2D1B69'] as const,
  darkCard: ['#1A1F3E', '#252A4A'] as const,
  goldShimmer: ['#C17D1A', '#F4A429', '#FFD700', '#F4A429', '#C17D1A'] as const,
  morph1: ['#2D1B69', '#6B3FA0'] as const,
  morph2: ['#0A0F2E', '#2D1B69'] as const,
  morph3: ['#6B3FA0', '#F4A429'] as const,
  heroOverlay: ['rgba(0,0,0,0)', 'rgba(10,15,46,0.85)'] as const,
  sectionFade: ['rgba(10,15,46,0)', 'rgba(10,15,46,1)'] as const,
  buttonPrimary: ['#F4A429', '#C17D1A'] as const,
  buttonSecondary: ['#2D1B69', '#4A2580'] as const,
} as const;

export const LightTheme = {
  background: Colors.cream,
  surface: Colors.white,
  card: Colors.white,
  border: 'rgba(45,27,105,0.12)',
  text: '#1A0A2E',
  textSecondary: '#4A3070',
  textMuted: '#8B7FA8',
  primary: Colors.purple,
  accent: Colors.gold,
  glass: Colors.glassLight,
  skeleton: Colors.skeletonLight,
  skeletonShimmer: Colors.skeletonShimmerLight,
  shadow: 'rgba(45,27,105,0.15)',
};

export const DarkTheme = {
  background: Colors.darkBg,
  surface: Colors.darkSurface,
  card: Colors.darkCard,
  border: Colors.darkBorder,
  text: Colors.darkText,
  textSecondary: 'rgba(245,245,245,0.7)',
  textMuted: Colors.darkMuted,
  primary: Colors.gold,
  accent: Colors.gold,
  glass: Colors.glassDark,
  skeleton: Colors.skeletonDark,
  skeletonShimmer: Colors.skeletonShimmerDark,
  shadow: 'rgba(0,0,0,0.4)',
};
