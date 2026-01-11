/**
 * HYTRAIN Design System
 *
 * Centralized design tokens for consistent HYROX-inspired styling.
 * Change values here to update them across the entire app.
 */

// =============================================================================
// FONTS
// =============================================================================
export const fonts = {
  heading: 'var(--font-bebas)',      // Bebas Neue - condensed bold for headings
  body: 'var(--font-barlow)',        // Barlow Condensed - athletic body text
  mono: 'var(--font-geist-mono)',    // Monospace for timers/numbers
};

// =============================================================================
// COLORS
// =============================================================================
export const colors = {
  // Brand Colors - HYROX Theme
  brand: {
    yellow: '#ffed00',        // Primary HYROX yellow - change this to rebrand
    yellowHover: '#e6d600',   // Hover state
    black: '#000000',         // True black
    white: '#ffffff',         // Pure white
  },

  // Background Colors
  bg: {
    page: '#000000',          // Main page background (true black)
    card: '#0a0a0a',          // Card/panel background
    cardAlt: '#141414',       // Alternative card background
    input: '#141414',         // Input fields
    elevated: '#1a1a1a',      // Elevated elements
    header: '#ffed00',        // Header background (HYROX yellow)
    nav: '#ffed00',           // Navigation background (HYROX yellow)
  },

  // Text Colors
  text: {
    primary: '#ffffff',       // Main text on dark backgrounds
    secondary: '#b3b3b3',     // Secondary text
    muted: '#808080',         // Muted text
    disabled: '#525252',      // Disabled text
    onYellow: '#000000',      // Text on yellow backgrounds
  },

  // Border Colors
  border: {
    default: '#262626',       // Subtle borders
    light: '#404040',         // More visible borders
    focus: '#ffed00',         // Focus state (yellow)
    onYellow: '#000000',      // Borders on yellow backgrounds
  },

  // Semantic Colors
  status: {
    success: '#22c55e',
    successBg: 'rgba(34, 197, 94, 0.15)',
    warning: '#eab308',
    warningBg: 'rgba(234, 179, 8, 0.15)',
    error: '#ef4444',
    errorBg: 'rgba(239, 68, 68, 0.15)',
    info: '#3b82f6',
    infoBg: 'rgba(59, 130, 246, 0.15)',
  },

  // Workout-specific colors
  workout: {
    run: '#1e3a5f',
    runBorder: '#1d4ed8',
    station: '#431407',
    stationBorder: '#c2410c',
    rest: '#1a1a1a',
    restBorder: '#262626',
  },

  // Ranking colors
  ranking: {
    elite: '#eab308',
    fast: '#a855f7',
    good: '#22c55e',
    solid: '#3b82f6',
    finish: '#6b7280',
  },
} as const;

// =============================================================================
// COMPONENT STYLES
// =============================================================================
export const styles = {
  // Header & Navigation (Yellow Bar)
  header: 'bg-[#ffed00] border-b-4 border-black',
  nav: 'bg-[#ffed00] border-b-2 border-black',

  // Section Headings (Yellow highlight box - HYROX style)
  sectionHeading: {
    wrapper: 'inline-block bg-[#ffed00] px-4 py-2 mb-4',
    text: 'text-black font-black tracking-wider uppercase text-lg sm:text-xl',
  },

  // Buttons
  btn: {
    primary: 'bg-[#ffed00] hover:bg-[#e6d600] text-black font-black uppercase tracking-wide rounded-lg transition-colors',
    secondary: 'bg-black hover:bg-[#1a1a1a] text-white border-2 border-[#ffed00] font-bold uppercase rounded-lg transition-colors',
    ghost: 'bg-transparent hover:bg-[#1a1a1a] text-white font-medium rounded-lg transition-colors',
    danger: 'bg-red-600 hover:bg-red-700 text-white font-bold uppercase rounded-lg transition-colors',
  },

  // Cards
  card: {
    base: 'bg-[#0a0a0a] rounded-xl',
    bordered: 'bg-[#0a0a0a] rounded-xl border border-[#262626]',
    elevated: 'bg-[#1a1a1a] rounded-xl',
    interactive: 'bg-[#0a0a0a] rounded-xl hover:bg-[#141414] transition-colors cursor-pointer',
  },

  // Inputs
  input: {
    base: 'bg-[#141414] border border-[#262626] rounded-lg text-white placeholder-gray-500 focus:border-[#ffed00] focus:outline-none transition-colors',
    select: 'bg-[#141414] border border-[#262626] rounded-lg text-white focus:border-[#ffed00] focus:outline-none cursor-pointer',
  },

  // Text styles
  text: {
    heading: 'font-black tracking-wider uppercase text-white',
    subheading: 'font-bold text-white uppercase tracking-wide',
    label: 'text-sm text-gray-400 font-medium uppercase tracking-wide',
    muted: 'text-gray-500 text-sm',
  },

  // Badges
  badge: {
    default: 'px-2 py-1 rounded text-xs font-bold uppercase',
    yellow: 'px-2 py-1 rounded text-xs font-bold uppercase bg-[#ffed00]/20 text-[#ffed00]',
    green: 'px-2 py-1 rounded text-xs font-bold uppercase bg-green-500/20 text-green-400',
    red: 'px-2 py-1 rounded text-xs font-bold uppercase bg-red-500/20 text-red-400',
    gray: 'px-2 py-1 rounded text-xs font-bold uppercase bg-gray-700 text-gray-300',
  },

  // Navigation tabs
  navTab: {
    base: 'flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 font-bold uppercase tracking-wide whitespace-nowrap border-b-4 transition-colors min-w-0 flex-1 sm:flex-none',
    active: 'text-black border-black bg-white/20',
    inactive: 'text-black/60 border-transparent hover:text-black hover:border-black/30',
  },

  // Workout blocks
  workoutBlock: {
    run: 'bg-[#1e3a5f]/50 border border-[#1d4ed8]',
    station: 'bg-[#431407]/50 border border-[#c2410c]',
    rest: 'bg-[#1a1a1a] border border-[#262626]',
  },
} as const;

// =============================================================================
// TAILWIND SHORTHAND CLASSES
// =============================================================================
export const tw = {
  // Backgrounds
  bgPage: 'bg-black',
  bgCard: 'bg-[#0a0a0a]',
  bgCardAlt: 'bg-[#141414]',
  bgInput: 'bg-[#141414]',
  bgElevated: 'bg-[#1a1a1a]',
  bgHeader: 'bg-[#ffed00]',
  bgNav: 'bg-[#ffed00]',

  // Borders
  border: 'border-[#262626]',
  borderLight: 'border-[#404040]',
  borderYellow: 'border-[#ffed00]',

  // Brand colors
  brandYellow: 'text-[#ffed00]',
  bgBrandYellow: 'bg-[#ffed00]',
  textOnYellow: 'text-black',

  // Text
  textPrimary: 'text-white',
  textSecondary: 'text-gray-400',
  textMuted: 'text-gray-500',
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================
export type Colors = typeof colors;
export type Styles = typeof styles;
export type Fonts = typeof fonts;
export type TailwindShorthand = typeof tw;
