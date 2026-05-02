import { ImageResponse } from 'next/og';

/**
 * Shared OG image template used by every `opengraph-image.tsx` route
 * handler under `src/app/(public)/`. Each page calls `renderOgImage`
 * with its own title/subtitle and returns the result; the visual
 * shell (gradient background, INK 37 wordmark, brand colors) stays
 * consistent across all per-page social previews.
 *
 * Lives in src/lib/ (not src/components/) because it's not a React
 * component you mount in JSX -- it returns an ImageResponse server-
 * side at request time. The `tsx` extension is required because
 * ImageResponse takes a JSX tree.
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png' as const;

export function renderOgImage({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          background:
            'radial-gradient(circle at 25% 25%, #1a0a0a 0%, #000000 60%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 56,
            fontWeight: 900,
            letterSpacing: '-0.04em',
            background: 'linear-gradient(90deg, #E63A35 0%, #FF6800 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            marginBottom: 32,
          }}
        >
          INK 37
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 88,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            maxWidth: '90%',
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              display: 'flex',
              fontSize: 32,
              fontWeight: 500,
              marginTop: 32,
              color: '#a3a3a3',
              maxWidth: '85%',
            }}
          >
            {subtitle}
          </div>
        ) : null}
        <div
          style={{
            display: 'flex',
            fontSize: 24,
            fontWeight: 500,
            marginTop: 'auto',
            color: '#737373',
          }}
        >
          Fernando Govea &middot; Dallas&ndash;Fort Worth, Texas
        </div>
      </div>
    ),
    OG_SIZE
  );
}
