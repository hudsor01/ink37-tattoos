/**
 * XSS detection for Zod refinements.
 * Rejects strings containing HTML tags, script injections, or event handlers.
 * Used at the validation layer to prevent HTML/script content from being stored.
 */

const HTML_PATTERN = /<[^>]*>|&lt;|&gt;|javascript:|on\w+\s*=/i;

/** Returns true if the string does NOT contain HTML/script content */
export function noHtml(value: string): boolean {
  return !HTML_PATTERN.test(value);
}

export const noHtmlMessage = 'Text must not contain HTML tags or script content';
