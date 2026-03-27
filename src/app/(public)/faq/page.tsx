import type { Metadata } from 'next';
import FAQClient from '@/components/public/faq-client';

export const metadata: Metadata = {
  title: 'FAQ | Ink 37 Tattoos',
  description:
    'Frequently asked questions about tattoo appointments, pricing, aftercare, and studio policies at Ink 37 Tattoos in Dallas-Fort Worth.',
  openGraph: {
    title: 'FAQ | Ink 37 Tattoos',
    description:
      'Everything you need to know about the tattoo experience at Ink 37 Tattoos.',
  },
};

export default function FAQPage() {
  return <FAQClient />;
}
