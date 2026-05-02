import { OG_SIZE, OG_CONTENT_TYPE, renderOgImage } from '@/lib/opengraph-template';

// Default OG image for the (public) route group. Acts as the fallback
// for any (public) page that doesn't ship its own opengraph-image.tsx.
// Per-page overrides exist for gallery / services / about / contact /
// faq / booking; this catches the home page and anything new that
// hasn't been customized yet.
export const alt = 'Ink 37 Tattoos | Custom Tattoo Art by Fernando Govea';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    title: 'Custom Tattoo Art',
    subtitle: 'Japanese, Traditional, Realism, and Custom Designs',
  });
}
