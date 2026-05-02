import { OG_SIZE, OG_CONTENT_TYPE, renderOgImage } from '@/lib/opengraph-template';

export const alt = 'FAQ — Everything you need to know about getting tattooed at Ink 37';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    title: 'FAQ',
    subtitle: 'Booking, pricing, aftercare, and studio policies — answered',
  });
}
