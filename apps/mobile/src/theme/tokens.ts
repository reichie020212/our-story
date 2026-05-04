/**
 * Theme tokens — ported from the web's "paper and ink" palette so
 * both surfaces feel like the same product. Adapt rhythms (spacing,
 * font sizes) for mobile-native expectations rather than mirroring
 * pixel-for-pixel.
 */

export const colors = {
  // Backgrounds
  paper: "#fafaf7",
  surface: "#ffffff",
  divider: "#e6e3da",

  // Text
  ink: "#1a1a1a",
  body: "#3a3a3a",
  dim: "#8a8a82",

  // Accents
  accent: "#a85b3b", // warm-ink heart for liked / bookmarked
  accentMuted: "#d4a98e",
  danger: "#c4422c",

  // Inputs
  inputBorder: "#d6d2c5",
  inputFocusBorder: "#1a1a1a",
} as const;

// 8pt grid. Use multiples of 4 only when intra-element spacing demands it.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

/**
 * Font family identifiers — these match the keys we register with
 * `useFonts` in the root layout. Using the literal strings here keeps
 * the rest of the app from importing from @expo-google-fonts directly.
 */
export const fonts = {
  serif: "Fraunces_400Regular",
  serifMedium: "Fraunces_600SemiBold",
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansBold: "Inter_600SemiBold",
} as const;

export type FontFamily = (typeof fonts)[keyof typeof fonts];

export const typography = {
  // Editorial — Fraunces, used for titles, blockquotes, story body.
  display: { fontFamily: fonts.serifMedium, fontSize: 32, lineHeight: 40 },
  title: { fontFamily: fonts.serifMedium, fontSize: 24, lineHeight: 32 },
  reader: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 30 },

  // UI — Inter.
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 18 },
  small: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16 },
  button: { fontFamily: fonts.sansBold, fontSize: 15, lineHeight: 20 },

  // Eyebrow — letter-spaced uppercase, matches the web's section headers.
  eyebrow: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
  },
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  fonts,
  typography,
} as const;

export type Theme = typeof theme;
