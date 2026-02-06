/**
 * Theme Utility Hooks and Helpers
 */

import { useTheme } from '@/libs/theme';
import { theme as themeConfig } from '@/config/theme';

/**
 * Hook to get current theme colors
 * Usage: const colors = useThemeColors();
 */
export function useThemeColors() {
    const { mode } = useTheme();
    return themeConfig.colors[mode];
}

/**
 * Hook to get typography settings
 */
export function useTypography() {
    return themeConfig.typography;
}

/**
 * Hook to get spacing values
 */
export function useSpacing() {
    return themeConfig.spacing;
}

/**
 * Hook to get border radius values
 */
export function useBorderRadius() {
    return themeConfig.borderRadius;
}

/**
 * Hook to get shadow values
 */
export function useShadows() {
    return themeConfig.shadows;
}

/**
 * Get CSS variable value
 */
export function getCSSVar(varName: string): string {
    if (typeof window === 'undefined') return '';
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

/**
 * Set CSS variable value
 */
export function setCSSVar(varName: string, value: string): void {
    if (typeof window === 'undefined') return;
    document.documentElement.style.setProperty(varName, value);
}
