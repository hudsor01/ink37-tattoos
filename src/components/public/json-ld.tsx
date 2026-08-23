/**
 * Renders a JSON-LD <script> tag.
 *
 * NO NONCE, AND DELIBERATELY SYNCHRONOUS.
 *
 * This component used to `await headers()` to stamp the per-request CSP
 * nonce onto the tag, which required wrapping it in `<Suspense>`. Both were
 * pointless: a `<script>` whose type is not a JavaScript MIME type is a
 * *data block*, not executable script. Per HTML's "prepare the script
 * element" algorithm, such an element returns at the type-determination step,
 * before the "should element's inline behavior be blocked by Content Security
 * Policy?" check ever runs. `script-src` therefore never applies to
 * `application/ld+json`, and the nonce bought exactly nothing.
 *
 * The cost was real, though: reading headers() makes a component dynamic
 * under `cacheComponents: true`, so every JSON-LD block -- site-wide
 * (layout.tsx), per-page (/about, /services, /faq) and every BreadcrumbNav --
 * was forced out of the statically prerendered shell into a streamed
 * Suspense hole. Dropping the nonce lets the structured data be prerendered.
 *
 * Trusted-input contract: callers pass a hardcoded or props-derived object
 * literal. Do not pass raw user input -- the JSON is emitted verbatim via
 * dangerouslySetInnerHTML, which is the canonical pattern for JSON-LD per the
 * Next.js docs. `<` is escaped to < so a `</script>` substring in the
 * data cannot terminate the tag early (see the JsonLd tests in csp.test.ts).
 */
export function JsonLd({ data }: { data: unknown }) {
  // JSON.stringify returns the VALUE undefined -- not a string -- for
  // undefined, functions and symbols, so calling .replace() on it throws
  // TypeError. `data ?? null` is NOT sufficient: a function is neither null
  // nor undefined but still stringifies to undefined. Checking the result
  // covers every case.
  //
  // This matters more than it looks: `data: unknown` means an optional schema
  // typechecks clean at the call site, and JsonLd now renders directly in
  // layout.tsx's <body> with no Suspense boundary below the root -- under
  // cacheComponents a throw there fails the prerender for EVERY route at
  // build time rather than degrading one streamed hole.
  const json = JSON.stringify(data);
  const safe = typeof json === 'string' ? json : 'null';

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safe.replace(/</g, '\\u003c'),
      }}
    />
  );
}
