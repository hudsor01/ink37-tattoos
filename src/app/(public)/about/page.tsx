import type { Metadata } from 'next';
import AboutClient from '@/components/public/about-client';

export const metadata: Metadata = {
  title: 'About Fernando Govea | Ink 37 Tattoos',
  description:
    'Meet Fernando Govea, the master tattoo artist behind Ink 37 Tattoos. Over a decade of experience crafting custom tattoo art in Dallas-Fort Worth, Texas.',
  openGraph: {
    title: 'About Fernando Govea | Ink 37 Tattoos',
    description:
      'Meet Fernando Govea, the master tattoo artist behind Ink 37 Tattoos in Dallas-Fort Worth.',
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
