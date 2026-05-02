import { OG_SIZE, OG_CONTENT_TYPE, renderOgImage } from '@/lib/opengraph-template';

export const alt = 'Book an Appointment — Consultation, design review, or tattoo session at Ink 37';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    title: 'Book an Appointment',
    subtitle: 'Consultation, design review, or tattoo session — start with a free consult',
  });
}
