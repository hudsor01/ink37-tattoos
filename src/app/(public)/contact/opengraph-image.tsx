import { OG_SIZE, OG_CONTENT_TYPE, renderOgImage } from '@/lib/opengraph-template';

export const alt = 'Contact Ink 37 Tattoos — Send a message or book a consultation';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    title: 'Get in Touch',
    subtitle: 'Send a message about your tattoo idea or book a consultation',
  });
}
