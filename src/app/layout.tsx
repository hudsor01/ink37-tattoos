import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://ink37tattoos.com'
  ),
  title: {
    default: 'Ink 37 Tattoos | Custom Tattoo Art by Fernando Govea',
    template: '%s | Ink 37 Tattoos',
  },
  description:
    'Professional tattoo artistry in a clean, comfortable studio. Custom tattoo art, consultations, and appointments.',
  keywords: [
    'tattoo',
    'custom tattoo',
    'tattoo artist',
    'tattoo studio',
    'Fernando Govea',
    'Ink 37',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Ink 37 Tattoos',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TattooParlor',
  name: 'Ink 37 Tattoos',
  description:
    'Professional tattoo artistry in a clean, comfortable studio.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://ink37tattoos.com',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
