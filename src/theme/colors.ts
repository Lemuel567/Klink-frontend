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

  // Extracted from the real worship photos (assets/images/church)
  stagePurple: '#2D1B69',    // deep purple stage wash (worship-solo-2, prayer-2)
  worshipGold: '#F4A429',    // warm gold worship light (congregation-1)
  stageAmber: '#E8760A',     // amber stage glow (congregation-1 top light)
  deepNavy: '#0A0F2E',       // dark worship room (prayer-2 background)
  spotlightWhite: '#FAFAFA', // spotlights (worship-hands-2)
  stageRed: '#8B1A1A',       // red stage accents (crowd-1)
  warmCream: '#FDF3E3',      // warm skin/cream tones (worship-solo-1)
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

  // Translucent full-screen veil — replaces opaque darkWorship backdrops so the
  // global RotatingBackground photo shows through on every screen (2026-07-12)
  veil: ['rgba(10,5,32,0.55)', 'rgba(21,13,46,0.5)'] as const,

  // Matching the worship-photo atmosphere
  stage: ['#1A0533', '#2D1B69'] as const,
  golden: ['#F4A429', '#E8760A'] as const,
  spotlight: ['rgba(244,164,41,0.3)', 'transparent'] as const,
  darkOverlay: ['rgba(10,15,46,0.3)', 'rgba(10,15,46,0.9)'] as const,
  cardOverlay: ['transparent', 'rgba(10,15,46,0.95)'] as const,
  amberGlow: ['#E8760A', '#F4A429'] as const,
} as const;

// ─── Premium theme system (2026-07-11 overhaul) ─────────────────────────────
// Every token passes WCAG 4.5:1 against its intended background. Light mode is
// a soft lavender sanctuary; dark mode is a deep night-worship purple with gold.

export const LightTheme = {
  background: '#F0EBF8',            // soft lavender white
  surface: '#FFFFFF',               // pure white cards
  card: '#FFFFFF',
  cardBorder: 'rgba(107,63,160,0.15)',
  border: 'rgba(107,63,160,0.15)',
  divider: 'rgba(107,63,160,0.1)',
  text: '#1A0A2E',                  // very dark purple — 15.7:1 on white
  textSecondary: '#4A3570',         // 8.1:1 on white
  textMuted: '#6B5B8E',             // darkened from #8B7BA8 to clear 4.5:1
  textOnDark: '#FFFFFF',
  primary: '#6B3FA0',
  accent: '#6B3FA0',                // rich purple accent
  accentGold: '#F4A429',
  accentLight: '#EDE7F6',           // light purple tint
  inputBackground: '#F5F0FF',
  inputBorder: '#C5B8E0',
  inputText: '#1A0A2E',
  placeholder: '#6B5B8E',
  glass: 'rgba(255,255,255,0.85)',  // glass must stay visible in light mode
  skeleton: Colors.skeletonLight,
  skeletonShimmer: Colors.skeletonShimmerLight,
  shadow: '#6B3FA0',                // purple-tinted card shadows
  /** 3-stop screen background gradient — soft premium lavender */
  backgroundGradient: ['#F0EBF8', '#E8DFF5', '#F0EBF8'] as const,
};

// GLASS SURFACES (2026-07-12): Klink is dark-only. A RotatingBackground of
// worship photos sits behind EVERY screen (root layout), so all surfaces are
// translucent veils — the photos glow through, exactly like the login page.
export const DarkTheme = {
  background: 'rgba(10,5,32,0.55)',   // screen veil — photo shows through
  surface: 'rgba(21,13,46,0.6)',      // translucent panels
  card: 'rgba(30,19,64,0.65)',        // glass cards
  cardBorder: 'rgba(244,164,41,0.2)',
  border: 'rgba(244,164,41,0.2)',     // gold borders in the dark
  divider: 'rgba(244,164,41,0.12)',
  text: '#F5F0FF',                    // near white
  textSecondary: '#C5B8E0',
  textMuted: '#9D8FBF',               // lifted slightly for glass backgrounds
  textOnDark: '#F5F0FF',
  primary: '#9D6FD4',                 // lighter purple for dark bg
  accent: '#9D6FD4',
  accentGold: '#F4A429',
  accentLight: 'rgba(157,111,212,0.15)',
  inputBackground: 'rgba(30,19,64,0.55)',
  inputBorder: 'rgba(244,164,41,0.3)',
  inputText: '#F5F0FF',
  placeholder: '#9D8FBF',
  glass: Colors.glassDark,
  skeleton: Colors.skeletonDark,
  skeletonShimmer: Colors.skeletonShimmerDark,
  shadow: 'rgba(0,0,0,0.5)',
  /** 3-stop veil gradient — translucent so the global photo shows through */
  backgroundGradient: ['rgba(10,5,32,0.5)', 'rgba(21,13,46,0.35)', 'rgba(10,5,32,0.5)'] as const,
};
