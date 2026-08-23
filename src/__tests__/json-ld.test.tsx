import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { JsonLd } from '@/components/public/json-ld';

/**
 * Renders the REAL component.
 *
 * These assertions used to live in csp.test.ts, where they declared a private
 * `safeStringify()` copy of the transformation and never imported JsonLd at
 * all -- so they proved a property of the test file. Deleting
 * `.replace(/</g, '\u003c')` from json-ld.tsx left the whole suite green
 * while every <JsonLd> on the root layout, /about, /services, /faq and every
 * BreadcrumbNav became a </script> breakout vector.
 *
 * Both blockers to testing the real thing are gone: JsonLd is now synchronous
 * (it no longer awaits headers()) and unwrapped, so renderToStaticMarkup can
 * render it directly.
 */
describe('JsonLd', () => {
  const render = (data: unknown) => renderToStaticMarkup(<JsonLd data={data} />);

  it('emits a JSON-LD script tag', () => {
    const html = render({ '@type': 'TattooShop', name: 'Ink 37' });
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('Ink 37');
  });

  /**
   * JSON.stringify alone does not escape `<`, so a `</script>` substring in
   * the data would close the tag and let the rest parse as HTML. `<` is the
   * only character that needs escaping -- it is what starts a tag boundary.
   */
  it('escapes < so </script> cannot break out of the tag', () => {
    const html = render({ label: '</script><script>alert(1)</script>' });
    expect(html).not.toContain('</script><script>');
    expect(html).toContain('\\u003c/script>');
    expect(html).toContain('\\u003cscript>');
  });

  it('escapes < in nested values and keys', () => {
    const html = render({ a: { b: ['</script>'] } });
    expect(html).not.toContain('</script>x');
    expect(html).toContain('\\u003c/script>');
  });

  it('round-trips to the original value after unescaping', () => {
    const data = { label: '</script><script>alert(1)</script>' };
    const html = render(data);
    const json = html
      .replace(/^<script type="application\/ld\+json">/, '')
      .replace(/<\/script>$/, '');
    expect(JSON.parse(json)).toEqual(data);
  });

  /**
   * JSON.stringify returns the VALUE undefined (not a string) for
   * undefined/function/symbol, so `.replace` on it throws TypeError. `data:
   * unknown` lets an optional schema typecheck clean at the call site, and
   * JsonLd now renders directly in layout.tsx's <body> with no Suspense
   * boundary below the root -- so a throw there would fail the prerender for
   * every route at build time.
   */
  it.each([undefined, () => {}, Symbol('x')])(
    'renders nothing for input that does not serialize to a string (%o)',
    (data) => {
      expect(() => render(data)).not.toThrow();
      expect(render(data)).toBe('');
    }
  );

  /**
   * JSON.stringify THROWS on these rather than returning undefined, so a
   * result-type check alone never runs. JsonLd sits in layout.tsx's <body>
   * with no Suspense boundary below the root, so under cacheComponents an
   * escaping throw fails the prerender for every route at build time.
   */
  it('renders nothing for a circular structure instead of throwing', () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    expect(() => render(circular)).not.toThrow();
    expect(render(circular)).toBe('');
  });

  it('renders nothing for BigInt instead of throwing', () => {
    expect(() => render({ n: 1n })).not.toThrow();
    expect(render({ n: 1n })).toBe('');
  });

  it('still renders null explicitly passed as data', () => {
    // `null` IS serializable, so it round-trips rather than being dropped.
    expect(render(null)).toContain('application/ld+json');
  });
});
