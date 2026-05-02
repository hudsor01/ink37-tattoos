import type { Metadata } from 'next';
import AboutClient from '@/components/public/about-client';
import { BreadcrumbNav } from '@/components/public/breadcrumb-nav';
import { JsonLd } from '@/components/public/json-ld';

export const metadata: Metadata = {
  title: 'About Fernando Govea | Ink 37 Tattoos',
  description:
    'Meet Fernando Govea, the master tattoo artist behind Ink 37 Tattoos. Over a decade of experience crafting custom tattoo art in Dallas-Fort Worth, Texas.',
  openGraph: {
    title: 'About Fernando Govea | Ink 37 Tattoos',
    description:
      'Meet Fernando Govea, the master tattoo artist behind Ink 37 Tattoos in Dallas-Fort Worth.',
  },
  alternates: {
    canonical: '/about',
  },
};

// Standalone Person schema for the artist. Schema.org's Person type is
// surfaced separately from the LocalBusiness.founder reference in
// src/app/layout.tsx because dedicated Person schemas qualify for the
// Knowledge Graph and surface in artist-name searches with richer
// cards than a nested founder reference does.
//
// Note: `image` is intentionally omitted. Schema.org's Person.image
// is "an image of the person" -- using a tattoo portfolio piece would
// be misleading and could harm rich-result eligibility (Google has
// rejected mismatched person images in the past). When a real
// Fernando headshot is available, add it here.
const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Fernando Govea',
  givenName: 'Fernando',
  familyName: 'Govea',
  jobTitle: 'Professional Tattoo Artist',
  description:
    'Master tattoo artist with 10+ years experience and 1000+ completed pieces. Founder of Ink 37 Tattoos in Dallas-Fort Worth, specializing in Japanese traditional, American traditional, photorealism, and custom designs.',
  url: 'https://ink37tattoos.com/about',
  knowsAbout: [
    'Japanese Traditional Tattoos',
    'American Traditional Tattoos',
    'Photorealism Tattoos',
    'Custom Tattoo Design',
    'Cover-Up Tattoos',
    'Black and Grey Tattoos',
  ],
  sameAs: ['https://instagram.com/fennyg83'],
  worksFor: {
    '@type': 'TattooShop',
    name: 'Ink 37 Tattoos',
    url: 'https://ink37tattoos.com',
  },
};

export default function AboutPage() {
  return (
    <>
      <BreadcrumbNav
        items={[
          { label: 'Home', href: '/' },
          { label: 'About' },
        ]}
      />
      <JsonLd data={personSchema} />
      <AboutClient />
    </>
  );
}
