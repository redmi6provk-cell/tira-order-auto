/**
 * Centralized Theme Configuration
 * All design tokens, colors, typography, spacing, etc.
 */

export const theme = {
    // Color Palette
    colors: {
        // Light Theme
        light: {
            // Backgrounds
            bg: {
                primary: '#ffffff',
                secondary: '#f8fafc',
                tertiary: '#f1f5f9',
                elevated: '#ffffff',
            },
            // Text
            text: {
                primary: '#0f172a',
                secondary: '#475569',
                tertiary: '#64748b',
                disabled: '#94a3b8',
                inverse: '#ffffff',
            },
            // Borders
            border: {
                primary: '#e2e8f0',
                secondary: '#cbd5e1',
                focus: '#3b82f6',
            },
            // Brand Colors
            brand: {
                primary: '#3b82f6',
                primaryHover: '#2563eb',
                secondary: '#8b5cf6',
            },
            // Semantic Colors
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#3b82f6',
        },

        // Dark Theme
        dark: {
            // Backgrounds
            bg: {
                primary: '#0f172a',
                secondary: '#1e293b',
                tertiary: '#334155',
                elevated: '#1e293b',
            },
            // Text
            text: {
                primary: '#f1f5f9',
                secondary: '#cbd5e1',
                tertiary: '#94a3b8',
                disabled: '#64748b',
                inverse: '#0f172a',
            },
            // Borders
            border: {
                primary: '#334155',
                secondary: '#475569',
                focus: '#60a5fa',
            },
            // Brand Colors
            brand: {
                primary: '#60a5fa',
                primaryHover: '#3b82f6',
                secondary: '#a78bfa',
            },
            // Semantic Colors
            success: '#34d399',
            warning: '#fbbf24',
            error: '#f87171',
            info: '#60a5fa',
        },
    },

    // Typography
    typography: {
        fontFamily: {
            sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
        },
        fontSize: {
            xs: '0.75rem',      // 12px
            sm: '0.875rem',     // 14px
            base: '1rem',       // 16px
            lg: '1.125rem',     // 18px
            xl: '1.25rem',      // 20px
            '2xl': '1.5rem',    // 24px
            '3xl': '1.875rem',  // 30px
            '4xl': '2.25rem',   // 36px
        },
        fontWeight: {
            normal: '400',
            medium: '500',
            semibold: '600',
            bold: '700',
            extrabold: '800',
        },
        lineHeight: {
            tight: '1.25',
            normal: '1.5',
            relaxed: '1.75',
        },
    },

    // Spacing Scale
    spacing: {
        0: '0',
        1: '0.25rem',   // 4px
        2: '0.5rem',    // 8px
        3: '0.75rem',   // 12px
        4: '1rem',      // 16px
        5: '1.25rem',   // 20px
        6: '1.5rem',    // 24px
        8: '2rem',      // 32px
        10: '2.5rem',   // 40px
        12: '3rem',     // 48px
        16: '4rem',     // 64px
        20: '5rem',     // 80px
    },

    // Border Radius
    borderRadius: {
        none: '0',
        sm: '0.25rem',    // 4px
        base: '0.5rem',   // 8px
        md: '0.75rem',    // 12px
        lg: '1rem',       // 16px
        xl: '1.5rem',     // 24px
        '2xl': '2rem',    // 32px
        full: '9999px',
    },

    // Shadows
    shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    },

    // Transitions
    transitions: {
        fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
        base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
        slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    },

    // Z-Index Scale
    zIndex: {
        base: 0,
        dropdown: 1000,
        sticky: 1020,
        fixed: 1030,
        modalBackdrop: 1040,
        modal: 1050,
        popover: 1060,
        tooltip: 1070,
    },
} as const;

export type Theme = typeof theme;
export type ThemeMode = 'light' | 'dark';
