/**
 * API Middleware Utilities
 * 
 * Provides standardized rate limiting, error handling, and response formatting
 * for Next.js API routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { ZodSchema, ZodError } from 'zod';

/**
 * Rate limit an API route
 * 
 * @param request - The incoming request
 * @param identifier - Optional custom identifier (defaults to IP)
 * @param config - Rate limit configuration
 * @returns null if allowed, or a 429 response if rate limited
 */
export function rateLimit(
  request: NextRequest,
  identifier?: string,
  config: typeof RATE_LIMITS[keyof typeof RATE_LIMITS] = RATE_LIMITS.userAction
): Response | null {
  const key = identifier || getClientIP(request);
  const result = checkRateLimit(key, config);
  
  if (!result.success) {
    return rateLimitResponse(result);
  }
  
  return null;
}

/**
 * Validate request body against a Zod schema
 * 
 * @param body - The request body to validate
 * @param schema - Zod schema to validate against
 * @returns Parsed data or throws validation error
 */
export function validateBody<T>(body: unknown, schema: ZodSchema<T>): T {
  return schema.parse(body);
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse {
  const body: { error: string; details?: unknown } = { error: message };
  if (details) {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}

/**
 * Handle Zod validation errors
 */
export function handleValidationError(error: ZodError): NextResponse {
  const issues = error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
  
  return errorResponse('Validation failed', 400, { issues });
}

/**
 * Wrap an API handler with rate limiting and error handling
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config?: typeof RATE_LIMITS[keyof typeof RATE_LIMITS]
) {
  return async (request: NextRequest): Promise<NextResponse | Response> => {
    // Check rate limit
    const rateLimitResult = rateLimit(request, undefined, config);
    if (rateLimitResult) {
      return rateLimitResult;
    }
    
    // Call handler
    return handler(request);
  };
}

/**
 * Extract user ID from a request (for rate limiting by user)
 * This parses the Authorization header but doesn't fully verify it
 */
export function getUserIdFromToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    // Just decode the JWT payload without verification
    // (verification happens in the actual handler)
    const token = authHeader.substring(7);
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.user_id || payload.sub || null;
  } catch {
    return null;
  }
}
