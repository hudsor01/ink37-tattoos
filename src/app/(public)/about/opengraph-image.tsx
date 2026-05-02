import { OG_SIZE, OG_CONTENT_TYPE, renderOgImage } from '@/lib/opengraph-template';

export const alt = 'About Fernando Govea — Master tattoo artist behind Ink 37 Tattoos';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    title: 'About Fernando Govea',
    subtitle: 'Master tattoo artist with 10+ years of experience and 1000+ pieces',
  });
}
