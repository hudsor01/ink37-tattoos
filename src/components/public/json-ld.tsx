import { Suspense } from 'react';
import { headers } from 'next/headers';

/**
 * Renders a JSON-LD <script> tag with the per-request CSP nonce that
 * proxy.ts sets on x-nonce. Wrap usage in <Suspense fallback={null}>
 * because reading headers() makes this component dynamic per Cache
 * Components rules.
 *
 * Trusted-input contract: callers pass a hardcoded or props-derived
 * object literal. Do not pass raw user input -- the JSON is emitted
 * verbatim into the page via dangerouslySetInnerHTML, which is the
 * canonical pattern for JSON-LD per the Next.js docs.
 */
async function JsonLdInner({ data }: { data: unknown }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <Suspense fallback={null}>
      <JsonLdInner data={data} />
    </Suspense>
  );
}
