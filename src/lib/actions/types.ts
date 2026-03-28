/**
 * Shared server action return type.
 *
 * All server actions return ActionResult<T> for consistent error handling.
 * When Zod validation fails, fieldErrors maps field names to error messages
 * so Phase 15 UI can show inline field errors.
 */

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
