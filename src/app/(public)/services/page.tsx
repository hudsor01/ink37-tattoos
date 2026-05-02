import type { Metadata } from 'next';
import ServicesClient from '@/components/public/services-client';
import { BreadcrumbNav } from '@/components/public/breadcrumb-nav';
import { JsonLd } from '@/components/public/json-ld';

export const metadata: Metadata = {
  title: 'Tattoo Services | Ink 37 Tattoos',
  description:
    'Professional tattoo services including custom designs, traditional American, Japanese traditional, and photorealistic tattoos. View pricing, process, and book a consultation.',
  openGraph: {
    title: 'Tattoo Services | Ink 37 Tattoos',
    description:
      'Professional tattoo services including custom designs, traditional, Japanese, and realism tattoos in Dallas-Fort Worth.',
  },
  alternates: {
    canonical: '/services',
  },
};

// Service schema -- one OfferCatalog grouping the four signature
// services. The provider reference points back to the LocalBusiness
// in src/app/layout.tsx. Each service exposes priceRange + areaServed
// so it qualifies for service-listing rich results in Google's
// service-area-business search experience.
const provider = {
  '@type': 'TattooShop',
  name: 'Ink 37 Tattoos',
  url: 'https://ink37tattoos.com',
};

const areaServed = [
  { '@type': 'City', name: 'Fort Worth' },
  { '@type': 'City', name: 'Arlington' },
  { '@type': 'City', name: 'Crowley' },
  { '@type': 'City', name: 'Burleson' },
  { '@type': 'City', name: 'Mansfield' },
];

const servicesSchema = {
  '@context': 'https://schema.org',
  '@type': 'OfferCatalog',
  name: 'Tattoo Services',
  url: 'https://ink37tattoos.com/services',
  provider,
  itemListElement: [
    {
      '@type': 'Service',
      name: 'Custom Tattoo Designs',
      description:
        'Unique, personalized artwork created exclusively for you. Includes one-on-one design consultation, unlimited revisions, original artwork ownership.',
      serviceType: 'Custom Tattoo Design',
      provider,
      areaServed,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'USD',
        priceSpecification: {
          '@type': 'PriceSpecification',
          minPrice: 150,
          maxPrice: 2000,
          priceCurrency: 'USD',
        },
      },
    },
    {
      '@type': 'Service',
      name: 'Traditional American Tattoos',
      description:
        'Classic bold lines and vibrant colors in timeless American style.',
      serviceType: 'Traditional Tattoo',
      provider,
      areaServed,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'USD',
        priceSpecification: {
          '@type': 'PriceSpecification',
          minPrice: 100,
          maxPrice: 800,
          priceCurrency: 'USD',
        },
      },
    },
    {
      '@type': 'Service',
      name: 'Japanese Traditional Tattoos',
      description:
        'Authentic Japanese artistry with rich cultural symbolism. Large-scale compositions with traditional motifs.',
      serviceType: 'Japanese Tattoo',
      provider,
      areaServed,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'USD',
        priceSpecification: {
          '@type': 'PriceSpecification',
          minPrice: 200,
          maxPrice: 3000,
          priceCurrency: 'USD',
        },
      },
    },
    {
      '@type': 'Service',
      name: 'Photorealistic Tattoos',
      description:
        'Incredibly detailed artwork that looks like photographs on skin. Portrait specialization with advanced shading.',
      serviceType: 'Realism Tattoo',
      provider,
      areaServed,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'USD',
        priceSpecification: {
          '@type': 'PriceSpecification',
          minPrice: 300,
          maxPrice: 2500,
          priceCurrency: 'USD',
        },
      },
    },
  ],
};

export default function ServicesPage() {
  return (
    <>
      <BreadcrumbNav
        items={[
          { label: 'Home', href: '/' },
          { label: 'Services' },
        ]}
      />
      <JsonLd data={servicesSchema} />
      <ServicesClient />
    </>
  );
}
