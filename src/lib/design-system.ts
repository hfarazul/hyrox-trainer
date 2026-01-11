/**
 * HYROX Trainer Design System
 *
 * Centralized design tokens for consistent styling across the app.
 * Change colors here to update them everywhere.
 */

export const colors = {
  // Brand Colors
  brand: {
    yellow: '#ffed00',      // HYROX signature yellow
    orange: '#f97316',      // Primary action (orange-500)
    orangeLight: '#fb923c', // Hover state (orange-400)
    orangeDark: '#ea580c',  // Active state (orange-600)
    red: '#ef4444',         // Accent (red-500)
  },

  // Background Colors
  bg: {
    page: '#000000',        // Main page background (true black)
    card: '#141414',        // Card/panel background
    cardHover: '#1a1a1a',   // Card hover state
    input: '#1f1f1f',       // Input fields
    elevated: '#262626',    // Elevated elements (modals, dropdowns)
    nav: '#0a0a0a',         // Navigation background
  },

  // Text Colors
  text: {
    primary: '#ffffff',     // Main text
    secondary: '#a3a3a3',   // Secondary text (gray-400)
    muted: '#737373',       // Muted text (gray-500)
    disabled: '#525252',    // Disabled text (gray-600)
  },

  // Border Colors
  border: {
    default: '#262626',     // Subtle borders
    light: '#404040',       // More visible borders
    focus: '#f97316',       // Focus state (orange)
  },

  // Semantic Colors
  status: {
    success: '#22c55e',     // Green
    successBg: '#22c55e20', // Green with opacity
    warning: '#eab308',     // Yellow
    warningBg: '#eab30820', // Yellow with opacity
    error: '#ef4444',       // Red
    errorBg: '#ef444420',   // Red with opacity
    info: '#3b82f6',        // Blue
    infoBg: '#3b82f620',    // Blue with opacity
  },

  // Workout-specific colors
  workout: {
    run: '#1e3a5f',         // Run blocks background
    runBorder: '#1d4ed8',   // Run blocks border
    station: '#431407',     // Station blocks background
    stationBorder: '#c2410c', // Station blocks border
    rest: '#1f1f1f',        // Rest blocks background
  },

  // Ranking colors
  ranking: {
    elite: '#eab308',       // Gold/yellow
    fast: '#a855f7',        // Purple
    good: '#22c55e',        // Green
    solid: '#3b82f6',       // Blue
    finish: '#6b7280',      // Gray
  },
} as const;

/**
 * Reusable Tailwind class combinations
 * Use these for consistent component styling
 */
export const styles = {
  // Buttons
  btn: {
    primary: 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-lg transition-all',
    secondary: 'bg-[#1f1f1f] hover:bg-[#262626] text-white border border-[#262626] rounded-lg transition-colors',
    ghost: 'bg-transparent hover:bg-[#1a1a1a] text-gray-300 rounded-lg transition-colors',
    danger: 'bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors',
    yellow: 'bg-[#ffed00] hover:bg-[#e6d600] text-black font-bold rounded-lg transition-colors',
  },

  // Cards
  card: {
    base: 'bg-[#141414] rounded-xl',
    bordered: 'bg-[#141414] rounded-xl border border-[#262626]',
    elevated: 'bg-[#262626] rounded-xl',
    interactive: 'bg-[#141414] rounded-xl hover:bg-[#1a1a1a] transition-colors cursor-pointer',
  },

  // Inputs
  input: {
    base: 'bg-[#1f1f1f] border border-[#262626] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition-colors',
    select: 'bg-[#1f1f1f] border border-[#262626] rounded-lg text-white focus:border-orange-500 focus:outline-none cursor-pointer',
  },

  // Text styles
  text: {
    heading: 'font-black tracking-wide uppercase text-white',
    subheading: 'font-bold text-white',
    label: 'text-sm text-gray-400 font-medium',
    muted: 'text-gray-500 text-sm',
  },

  // Badges
  badge: {
    default: 'px-2 py-1 rounded text-xs font-semibold',
    yellow: 'px-2 py-1 rounded text-xs font-semibold bg-[#ffed00]/20 text-[#ffed00]',
    orange: 'px-2 py-1 rounded text-xs font-semibold bg-orange-500/20 text-orange-400',
    green: 'px-2 py-1 rounded text-xs font-semibold bg-green-500/20 text-green-400',
    red: 'px-2 py-1 rounded text-xs font-semibold bg-red-500/20 text-red-400',
    gray: 'px-2 py-1 rounded text-xs font-semibold bg-gray-700 text-gray-300',
  },

  // Navigation
  nav: {
    tab: 'flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-3 font-medium whitespace-nowrap border-b-2 transition-colors min-w-0 flex-1 sm:flex-none',
    tabActive: 'text-[#ffed00] border-[#ffed00]',
    tabInactive: 'text-gray-400 border-transparent hover:text-gray-200',
  },

  // Workout blocks
  workoutBlock: {
    run: 'bg-[#1e3a5f]/50 border border-[#1d4ed8]',
    station: 'bg-[#431407]/50 border border-[#c2410c]',
    rest: 'bg-[#1f1f1f] border border-[#262626]',
  },
} as const;

/**
 * Shorthand Tailwind classes for common patterns
 * Import these directly in components: import { tw } from '@/lib/design-system'
 */
export const tw = {
  // Backgrounds
  bgPage: 'bg-black',
  bgCard: 'bg-[#141414]',
  bgInput: 'bg-[#1f1f1f]',
  bgElevated: 'bg-[#262626]',
  bgNav: 'bg-[#0a0a0a]',

  // Borders
  border: 'border-[#262626]',
  borderLight: 'border-[#404040]',

  // Brand colors
  brandYellow: 'text-[#ffed00]',
  brandOrange: 'text-orange-500',
  bgBrandYellow: 'bg-[#ffed00]',

  // Text
  textPrimary: 'text-white',
  textSecondary: 'text-gray-400',
  textMuted: 'text-gray-500',
} as const;

// Type exports for TypeScript support
export type Colors = typeof colors;
export type Styles = typeof styles;
export type TailwindShorthand = typeof tw;
