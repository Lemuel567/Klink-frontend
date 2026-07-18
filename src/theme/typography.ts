export const FontFamily = {
  // Display / headings — spiritual authority, warmth of tradition
  displayBold: 'PlayfairDisplay_700Bold',
  displayMedium: 'PlayfairDisplay_500Medium',
  displayItalic: 'PlayfairDisplay_700Bold_Italic',

  // Body — clarity and readability at any size
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const FontSize = {
  hero: 48,
  h1: 36,
  h2: 28,
  h3: 22,
  h4: 18,
  large: 17,
  body: 16,
  small: 14,
  caption: 12,
  micro: 10,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
};

export const LineHeight = {
  tight: 1.2,
  snug: 1.4,
  normal: 1.6,
  relaxed: 1.75,
  loose: 2,
} as const;

export const LetterSpacing = {
  tightest: -2,
  tight: -1,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
} as const;

export const TextStyles = {
  hero: {
    fontSize: FontSize.hero,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tightest,
    lineHeight: FontSize.hero * LineHeight.tight,
  },
  h1: {
    fontSize: FontSize.h1,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
    lineHeight: FontSize.h1 * LineHeight.snug,
  },
  h2: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.tight,
    lineHeight: FontSize.h2 * LineHeight.snug,
  },
  h3: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.normal,
    lineHeight: FontSize.h3 * LineHeight.normal,
  },
  h4: {
    fontSize: FontSize.h4,
    fontWeight: FontWeight.medium,
    letterSpacing: LetterSpacing.normal,
    lineHeight: FontSize.h4 * LineHeight.normal,
  },
  body: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.body * LineHeight.relaxed,
    letterSpacing: LetterSpacing.normal,
  },
  bodyMedium: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    lineHeight: FontSize.body * LineHeight.relaxed,
  },
  small: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.small * LineHeight.normal,
  },
  caption: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.regular,
    letterSpacing: LetterSpacing.wide,
    lineHeight: FontSize.caption * LineHeight.normal,
  },
  label: {
    fontSize: FontSize.small,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wider,
    lineHeight: FontSize.small * LineHeight.snug,
  },
  button: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wide,
  },

  // ── Editorial refinements (2026-07-18) — additive tokens only ────────────
  // Quiet tracked-out section label ("EYEBROW") — the premium-editorial pattern:
  // small, uppercase, widely letter-spaced, sitting above a heading or section.
  eyebrow: {
    fontSize: 11,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.widest,
    lineHeight: 11 * LineHeight.snug,
    textTransform: 'uppercase' as const,
  },
  // Serif display tokens with the font family baked in, so screens can adopt
  // the Playfair display voice without hand-assembling it each time.
  displayHero: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.h1,
    letterSpacing: LetterSpacing.tight,
    lineHeight: FontSize.h1 * LineHeight.tight,
  },
  displayTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.h3,
    letterSpacing: LetterSpacing.normal,
    lineHeight: FontSize.h3 * LineHeight.snug,
  },
} as const;
