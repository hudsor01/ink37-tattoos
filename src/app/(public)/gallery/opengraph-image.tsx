import { OG_SIZE, OG_CONTENT_TYPE, renderOgImage } from '@/lib/opengraph-template';

export const alt = 'Tattoo Gallery — Ink 37 Tattoos portfolio by Fernando Govea';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    title: 'Portfolio Gallery',
    subtitle: 'Browse custom tattoo work across Japanese, Traditional, Realism, and more',
  });
}
