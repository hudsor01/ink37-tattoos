import type { Metadata } from 'next';
import ContactClient from '@/components/public/contact-client';
import { BreadcrumbNav } from '@/components/public/breadcrumb-nav';

export const metadata: Metadata = {
  title: 'Contact | Ink 37 Tattoos',
  description:
    'Get in touch with Fernando Govea at Ink 37 Tattoos. Send a message about your tattoo idea, ask questions, or book a consultation in Dallas-Fort Worth.',
  openGraph: {
    title: 'Contact | Ink 37 Tattoos',
    description:
      'Get in touch with Ink 37 Tattoos in Dallas-Fort Worth. Send a message or book a consultation.',
  },
};

export default function ContactPage() {
  return (
    <>
      <BreadcrumbNav
        items={[
          { label: 'Home', href: '/' },
          { label: 'Contact' },
        ]}
      />
      <ContactClient />
    </>
  );
}
