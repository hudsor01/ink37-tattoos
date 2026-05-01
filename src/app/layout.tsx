import { Suspense, type ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { inter, montserrat, pacifico, satisfy } from '../styles/fonts';
import { Providers } from '@/components/providers';
import { JsonLd } from '@/components/public/json-ld';
import './globals.css';

/**
 * Viewport metadata is split from `metadata` per Next 14+ guidance --
 * Next emits a deprecation warning if themeColor / viewport are set on
 * the Metadata object instead. themeColor controls the mobile browser
 * chrome (Safari address bar, Chrome status bar) so it must match the
 * forced-dark page background or the brand identity breaks above the
 * page content.
 */
export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
};

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

/**
 * Forwards the per-request nonce (set on x-nonce by proxy.ts) into the
 * Providers tree so next-themes' inline theme-bootstrap script carries
 * the matching CSP nonce. Without this, the browser blocks the bootstrap
 * script and users with localStorage-saved theme preferences see the
 * default theme regardless of their choice.
 *
 * Wrapped in <Suspense> per Cache Components rules: reading headers()
 * makes this component dynamic.
 */
async function NonceWiredProviders({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return <Providers nonce={nonce}>{children}</Providers>;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${montserrat.variable} ${pacifico.variable} ${satisfy.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        <JsonLd data={jsonLd} />
        <Suspense fallback={null}>
          <NonceWiredProviders>{children}</NonceWiredProviders>
        </Suspense>
      </body>
    </html>
  );
}
