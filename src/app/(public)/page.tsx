import type { Metadata } from 'next';
import HomeClient from '@/components/public/home-client';

export const metadata: Metadata = {
  title: 'Ink 37 Tattoos | Custom Tattoo Art by Fernando Govea',
  description:
    'Professional custom tattoo artistry by Fernando Govea in Dallas-Fort Worth, Texas. Specializing in Japanese, traditional, realism, and cover-up tattoos.',
  openGraph: {
    title: 'Ink 37 Tattoos | Custom Tattoo Art by Fernando Govea',
    description:
      'Professional custom tattoo artistry in Dallas-Fort Worth, Texas.',
    type: 'website',
  },
  alternates: {
    canonical: '/',
  },
};

export default function HomePage() {
  return <HomeClient />;
}
