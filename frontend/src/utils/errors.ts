/**
 * Error handling utilities for the frontend
 */

export interface ApiError {
    error: string;
    message: string;
    details?: any;
    status_code?: number;
}

export class AppError extends Error {
    public readonly code: string;
    public readonly details?: any;

    constructor(message: string, code: string = 'UNKNOWN_ERROR', details?: any) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.details = details;
    }
}

/**
 * Parse API error response and return user-friendly message
 */
export function parseApiError(error: any): string {
    // Network error
    if (!error.response) {
        return 'Network error. Please check your connection and try again.';
    }

    // API error response
    const data = error.response?.data;

    if (data?.message) {
        return data.message;
    }

    if (data?.error) {
        return data.error;
    }

    // HTTP status code messages
    const status = error.response?.status;
    switch (status) {
        case 400:
            return 'Invalid request. Please check your input.';
        case 401:
            return 'Authentication required. Please log in again.';
        case 403:
            return 'Access denied. You don\'t have permission for this action.';
        case 404:
            return 'Resource not found.';
        case 422:
            return 'Validation error. Please check your input.';
        case 500:
            return 'Server error. Please try again later.';
        case 503:
            return 'Service temporarily unavailable. Please try again later.';
        default:
            return 'An unexpected error occurred. Please try again.';
    }
}

/**
 * Get error details for debugging
 */
export function getErrorDetails(error: any): any {
    return error.response?.data?.details || error.message || 'No details available';
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
    return !error.response && error.request;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: any): boolean {
    return error.response?.status === 401;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: any): boolean {
    return error.response?.status === 422 || error.response?.status === 400;
}
