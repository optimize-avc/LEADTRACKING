/**
 * Currency and number formatting utilities
 */

/**
 * Format a number as USD currency with proper handling of large values
 * @param value - The numeric value to format
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
    value: number | undefined | null,
    options: {
        compact?: boolean;
        showDecimals?: boolean;
    } = {}
): string {
    const { compact = false, showDecimals = false } = options;

    // Handle undefined, null, NaN, or Infinity
    if (value === undefined || value === null || !isFinite(value)) {
        return '$0';
    }

    // Clamp extremely large values to prevent overflow display
    const safeValue = Math.min(Math.abs(value), 999999999999); // Max ~$999B

    try {
        if (compact) {
            // Compact format: $1.2M, $500K, etc.
            if (safeValue >= 1000000000) {
                return `$${(safeValue / 1000000000).toFixed(1)}B`;
            } else if (safeValue >= 1000000) {
                return `$${(safeValue / 1000000).toFixed(1)}M`;
            } else if (safeValue >= 1000) {
                return `$${(safeValue / 1000).toFixed(0)}K`;
            }
        }

        // Standard format with Intl.NumberFormat
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: showDecimals ? 2 : 0,
            maximumFractionDigits: showDecimals ? 2 : 0,
        }).format(safeValue);
    } catch {
        // Fallback for any formatting errors
        return `$${safeValue.toLocaleString()}`;
    }
}

/**
 * Format a number compactly (1K, 1M, etc.)
 * @param value - The numeric value to format
 * @returns Compact formatted string
 */
export function formatCompactNumber(value: number | undefined | null): string {
    if (value === undefined || value === null || !isFinite(value)) {
        return '0';
    }

    const safeValue = Math.min(Math.abs(value), 999999999999);

    if (safeValue >= 1000000000) {
        return `${(safeValue / 1000000000).toFixed(1)}B`;
    } else if (safeValue >= 1000000) {
        return `${(safeValue / 1000000).toFixed(1)}M`;
    } else if (safeValue >= 1000) {
        return `${(safeValue / 1000).toFixed(0)}K`;
    }

    return safeValue.toString();
}

/**
 * Format a percentage with proper bounds checking
 * @param value - The numeric value (0-100 or decimal)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number | undefined | null, decimals: number = 1): string {
    if (value === undefined || value === null || !isFinite(value)) {
        return '0%';
    }

    // Clamp to 0-100 range
    const clampedValue = Math.max(0, Math.min(100, value));
    return `${clampedValue.toFixed(decimals)}%`;
}
