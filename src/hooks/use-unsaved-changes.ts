'use client';

import { useEffect } from 'react';

/**
 * Registers a `beforeunload` event when `isDirty` is true,
 * prompting the user before they navigate away from the page.
 */
export function useUnsavedChanges(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}
