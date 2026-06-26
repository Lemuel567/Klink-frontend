export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  // page padding
  pagePadding: 20,
  // card padding
  cardPadding: 16,
  // section gap
  sectionGap: 32,
} as const;

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 999,
} as const;

export const Shadows = {
  light: {
    sm: {
      shadowColor: 'rgba(45,27,105,0.1)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: 'rgba(45,27,105,0.15)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 4,
    },
    lg: {
      shadowColor: 'rgba(45,27,105,0.2)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 24,
      elevation: 8,
    },
    card: {
      shadowColor: 'rgba(45,27,105,0.15)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 24,
      elevation: 6,
    },
  },
  dark: {
    sm: {
      shadowColor: 'rgba(0,0,0,0.3)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: 'rgba(0,0,0,0.4)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 4,
    },
    lg: {
      shadowColor: 'rgba(0,0,0,0.5)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 24,
      elevation: 8,
    },
    card: {
      shadowColor: 'rgba(0,0,0,0.4)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 24,
      elevation: 6,
    },
  },
} as const;

export const ZIndex = {
  base: 0,
  card: 10,
  sticky: 20,
  overlay: 40,
  modal: 100,
  toast: 200,
  tooltip: 300,
} as const;
