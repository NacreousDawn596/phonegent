/**
 * constants/theme.ts
 * Apple/Vercel-inspired dark minimal design system
 */

export const Colors = {
  // Backgrounds
  bg:        '#09090b',   // almost-black zinc-950
  surface:   '#18181b',   // zinc-900
  elevated:  '#27272a',   // zinc-800
  border:    '#3f3f46',   // zinc-700
  borderDim: '#27272a',

  // Text
  text:      '#fafafa',   // zinc-50
  textMuted: '#a1a1aa',   // zinc-400
  textDim:   '#71717a',   // zinc-500

  // Accent
  accent:    '#6366f1',   // indigo-500
  accentBg:  '#1e1b4b',   // indigo-950
  accentMuted:'#4338ca',  // indigo-700

  // Semantic
  success:   '#22c55e',
  warning:   '#f59e0b',
  danger:    '#ef4444',
  dangerBg:  '#450a0a',

  // Chat bubbles
  userBubble:      '#6366f1',
  assistantBubble: '#18181b',
  toolBubble:      '#0c0a09',     // amber tint bg
  toolText:        '#d97706',     // amber

  // Glass / blur
  glassLight: 'rgba(255,255,255,0.04)',
  glassBorder:'rgba(255,255,255,0.08)',
} as const;

export const Typography = {
  fontMono: 'Courier New',

  // Sizes
  xs:   11,
  sm:   13,
  base: 15,
  lg:   17,
  xl:   20,
  '2xl':24,
  '3xl':30,
} as const;

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  '2xl':24,
  '3xl':32,
} as const;

export const Radius = {
  sm:  6,
  md:  10,
  lg:  16,
  xl:  22,
  full:9999,
} as const;
