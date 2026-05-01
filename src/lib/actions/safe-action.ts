'use server';

import { z } from 'zod';
import type { ActionResult } from './types';
import { isFrameworkSignal } from '@/lib/auth-guard';
import { logger } from '@/lib/logger';

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
 * 1. Re-throws Next.js internal errors (redirect, notFound, forbidden, unauthorized)
 * 2. Zod validation errors -> fieldErrors via z.flattenError (Zod 4 API)
 * 3. FK validation errors -> user-friendly message
 * 4. DB constraint violations -> user-friendly message
 * 5. Scheduling conflicts -> pass through message
 * 6. All other errors -> generic message + logger.error
 */
export async function safeAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error: unknown) {
    // 1. Re-throw Next.js framework signals so the framework can render
    //    the matching route convention (redirect, notFound, forbidden,
    //    unauthorized) and partial prerender abort signals can do their
    //    job. Uses the shared isFrameworkSignal helper -- the previous
    //    inline check missed HANGING_PROMISE_REJECTION and required two
    //    branches (message-prefix + digest-prefix); the helper covers
    //    every signal via the digest property convention.
    if (isFrameworkSignal(error)) throw error;

    // Test contexts mock next/navigation to throw bare Errors with the
    // signal name in the message but no digest property. Preserve the
    // old message-prefix branch so existing test mocks continue to work
    // until a follow-up updates them to attach a digest.
    if (
      error instanceof Error &&
      (error.message === 'NEXT_REDIRECT' ||
        error.message === 'NEXT_NOT_FOUND' ||
        error.message.startsWith('NEXT_HTTP_ERROR_FALLBACK') ||
        error.message.startsWith('NEXT_REDIRECT'))
    ) {
      throw error;
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
    logger.error({ err: error }, 'Unexpected action error');
    return { success: false, error: 'An unexpected error occurred' };
  }
}
