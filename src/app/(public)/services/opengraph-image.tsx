import { OG_SIZE, OG_CONTENT_TYPE, renderOgImage } from '@/lib/opengraph-template';

export const alt = 'Tattoo Services — Custom, Traditional, Japanese, and Realism by Ink 37';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    title: 'Tattoo Services',
    subtitle: 'Custom designs, Traditional, Japanese, and Photorealistic work',
  });
}
