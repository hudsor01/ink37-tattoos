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
 * data cannot terminate the tag early (see src/__tests__/json-ld.test.tsx,
 * which renders this component rather than re-implementing the escape).
 */
export function JsonLd({ data }: { data: unknown }) {
  // Serializing defensively, because `data: unknown` accepts anything and a
  // failure here is unusually expensive.
  //
  // JsonLd renders directly in layout.tsx's <body> with no Suspense boundary
  // below the root, so under `cacheComponents: true` a throw fails the
  // prerender for EVERY route at build time. Two distinct failure modes:
  //
  //   - JSON.stringify RETURNS the value undefined (not a string) for
  //     undefined, functions and symbols -- `.replace` on that throws
  //     TypeError. `data ?? null` does not help: a function is neither null
  //     nor undefined.
  //   - JSON.stringify THROWS outright on circular references
  //     ("Converting circular structure to JSON") and on BigInt
  //     ("Do not know how to serialize a BigInt"), so it never reaches any
  //     result check at all.
  //
  // Rendering nothing beats emitting `<script type="application/ld+json">
  // null</script>`, which Google's structured-data parser reports as an
  // error.
  let json: string;
  try {
    const serialized = JSON.stringify(data);
    if (typeof serialized !== 'string') return null;
    json = serialized;
  } catch {
    return null;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: json.replace(/</g, '\\u003c'),
      }}
    />
  );
}
