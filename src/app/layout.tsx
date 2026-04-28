import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { inter, montserrat, pacifico, satisfy } from '../styles/fonts';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://ink37tattoos.com'
  ),
  title: {
    default: 'Ink 37 Tattoos | Custom Tattoo Art by Fernando Govea',
    template: '%s | Ink 37 Tattoos',
  },
  description:
    'Professional custom tattoo artistry by Fernando Govea in Dallas-Fort Worth, Texas. Specializing in Japanese, traditional, realism, and cover-up tattoos. Book a consultation today.',
  applicationName: 'Ink 37 Tattoos',
  authors: [{ name: 'Fernando Govea', url: 'https://ink37tattoos.com' }],
  keywords: [
    'tattoo',
    'custom tattoo',
    'tattoo artist',
    'tattoo studio',
    'Fernando Govea',
    'Ink 37',
    'Dallas Fort Worth tattoo',
    'Japanese tattoo',
    'traditional tattoo',
    'realism tattoo',
    'cover-up tattoo',
    'DFW tattoo artist',
  ],
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
    ],
    apple: '/icons/apple-icon.png',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://ink37tattoos.com',
    siteName: 'Ink 37 Tattoos',
    images: [
      {
        url: '/images/japanese.jpg',
        width: 1200,
        height: 630,
        alt: 'Professional custom tattoo artwork by Ink 37 Tattoos',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': ['TattooShop', 'LocalBusiness'],
  name: 'Ink 37 Tattoos',
  description:
    'Professional custom tattoo artistry by Fernando Govea in Dallas-Fort Worth, Texas.',
  url: 'https://ink37tattoos.com',
  logo: 'https://ink37tattoos.com/logo.png',
  image: [
    'https://ink37tattoos.com/images/japanese.jpg',
    'https://ink37tattoos.com/images/traditional.jpg',
    'https://ink37tattoos.com/images/realism.jpg',
  ],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Crowley',
    addressRegion: 'TX',
    addressCountry: 'US',
  },
  areaServed: [
    { '@type': 'City', name: 'Fort Worth' },
    { '@type': 'City', name: 'Arlington' },
    { '@type': 'City', name: 'Crowley' },
    { '@type': 'City', name: 'Burleson' },
    { '@type': 'City', name: 'Mansfield' },
  ],
  openingHours: ['Mo-Sa 10:00-18:00'],
  priceRange: '$$',
  founder: {
    '@type': 'Person',
    name: 'Fernando Govea',
    jobTitle: 'Professional Tattoo Artist',
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${montserrat.variable} ${pacifico.variable} ${satisfy.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
