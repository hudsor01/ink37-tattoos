import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ink 37 Tattoos - Professional Tattoo Artist in Dallas/Fort Worth, TX',
    short_name: 'Ink37',
    description:
      'Professional custom tattoo artist serving Dallas/Fort Worth.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#0a0a0a',
    icons: [
      {
        src: '/icons/icon-72x72.png',
        sizes: '72x72',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-128x128.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-144x144.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-152x152.png',
        sizes: '152x152',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Book Consultation',
        short_name: 'Book',
        url: '/booking',
        icons: [
          {
            src: '/icons/booking-icon.png',
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'View Gallery',
        short_name: 'Gallery',
        url: '/gallery',
        icons: [
          {
            src: '/icons/gallery-icon.png',
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Contact Us',
        short_name: 'Contact',
        url: '/contact',
        icons: [
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
    ],
  };
}
