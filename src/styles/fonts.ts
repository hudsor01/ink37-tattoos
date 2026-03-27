import { Inter, Montserrat, Pacifico, Satisfy } from 'next/font/google';

export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  fallback: ['system-ui', 'sans-serif'],
  preload: true,
  adjustFontFallback: true,
});

export const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
  fallback: ['system-ui', 'sans-serif'],
  preload: true,
  adjustFontFallback: true,
});

export const pacifico = Pacifico({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pacifico',
  fallback: ['cursive'],
  preload: false,
});

export const satisfy = Satisfy({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-satisfy',
  fallback: ['cursive'],
  preload: false,
});
