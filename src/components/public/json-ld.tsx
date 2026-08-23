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
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
