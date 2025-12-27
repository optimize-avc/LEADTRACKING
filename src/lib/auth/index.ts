/**
 * Auth Library Exports
 * 
 * Centralized exports for authentication utilities
 */

export {
    verifyAuthToken,
    createAuthErrorResponse,
    validateUserIdMatch,
    withAuth,
    type AuthResult,
    type AuthError,
    type AuthVerificationResult,
} from './middleware';
