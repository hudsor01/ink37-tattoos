import type { Metadata } from 'next';
import ServicesClient from '@/components/public/services-client';

export const metadata: Metadata = {
  title: 'Tattoo Services | Ink 37 Tattoos',
  description:
    'Professional tattoo services including custom designs, traditional American, Japanese traditional, and photorealistic tattoos. View pricing, process, and book a consultation.',
  openGraph: {
    title: 'Tattoo Services | Ink 37 Tattoos',
    description:
      'Professional tattoo services including custom designs, traditional, Japanese, and realism tattoos in Dallas-Fort Worth.',
  },
};

export default function ServicesPage() {
  return <ServicesClient />;
}
