'use server';

import { z } from 'zod';
import type { ActionResult } from './types';

/**
 * Wraps a server action callback with consistent error handling.
 *
 * Usage:
 *   return safeAction(async () => {
 *     const validated = SomeSchema.parse(data);
 *     return await someDalFunction(validated);
 *   });
 *
 * Error handling priority:
 * 1. Re-throws Next.js internal errors (redirect/notFound)
 * 2. Zod validation errors -> fieldErrors via z.flattenError (Zod 4 API)
 * 3. FK validation errors -> user-friendly message
 * 4. DB constraint violations -> user-friendly message
 * 5. Scheduling conflicts -> pass through message
 * 6. All other errors -> generic message + console.error
 */
export async function safeAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error: unknown) {
    // 1. Re-throw Next.js internal errors (redirect/notFound)
    if (error instanceof Error) {
      if (error.message === 'NEXT_REDIRECT' || error.message === 'NEXT_NOT_FOUND') {
        throw error;
      }

      // Also handle Next.js digest-based detection (used in some Next.js versions)
      if ('digest' in error && typeof (error as Record<string, unknown>).digest === 'string') {
        const digest = (error as Record<string, unknown>).digest as string;
        if (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_NOT_FOUND')) {
          throw error;
        }
      }
    }

    // 2. Zod validation errors
    if (error instanceof z.ZodError) {
      const flattened = z.flattenError(error);
      const fieldErrors: Record<string, string[]> = {};
      const rawFieldErrors = flattened.fieldErrors as Record<string, string[] | undefined>;
      for (const [key, messages] of Object.entries(rawFieldErrors)) {
        if (messages && messages.length > 0) {
          fieldErrors[key] = messages;
        }
      }
      return {
        success: false,
        error: 'Validation failed',
        fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      };
    }

    if (error instanceof Error) {
      const msg = error.message;

      // 3. FK validation errors (thrown by DAL pre-insert checks)
      if (
        msg.startsWith('Customer not found') ||
        msg.startsWith('Artist not found') ||
        msg.includes('does not exist')
      ) {
        return { success: false, error: msg };
      }

      // 4. DB constraint violations
      if (msg.includes('violates foreign key')) {
        return {
          success: false,
          error: 'Referenced record does not exist. Please check your selections.',
        };
      }
      if (msg.includes('violates unique constraint')) {
        return {
          success: false,
          error: 'A record with this information already exists.',
        };
      }

      // 5. Scheduling conflict errors
      if (msg.includes('scheduling conflict')) {
        return { success: false, error: msg };
      }
    }

    // 6. All other errors
    console.error('Unexpected action error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
