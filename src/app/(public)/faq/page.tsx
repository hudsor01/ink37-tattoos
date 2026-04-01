import type { Metadata } from 'next';
import FAQClient from '@/components/public/faq-client';
import { BreadcrumbNav } from '@/components/public/breadcrumb-nav';

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

const faqStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What are your working hours?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'I work by appointment only, which allows me to provide dedicated attention to each client. This flexible scheduling means I can accommodate various time preferences based on availability.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I book an appointment?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "You can book an appointment through our online booking system. Simply select your preferred time, and I'll confirm your appointment within 24 hours.",
      },
    },
    {
      '@type': 'Question',
      name: 'How old do I have to be to get a tattoo?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You must be at least 18 years old with a valid government-issued photo ID to get a tattoo at our studio. No exceptions are made, regardless of parental consent.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much do tattoos cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Pricing varies based on size, complexity, and placement. I provide detailed quotes after our consultation where we discuss your design ideas. I believe in transparent pricing with no hidden fees.',
      },
    },
    {
      '@type': 'Question',
      name: 'What payment methods do you accept?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'I accept cash, credit/debit cards, and digital payments. A deposit is required to secure your appointment, which goes toward your final tattoo cost.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long does a tattoo take?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Session length depends on the size and complexity of your design. Small tattoos may take 1-2 hours, while larger pieces could require multiple sessions over several hours each.',
      },
    },
    {
      '@type': 'Question',
      name: 'What styles do you specialize in?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'I work across a wide range of styles including Traditional, Neo-Traditional, Realism, Blackwork, Illustrative, Japanese, Lettering, and Cover-ups.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I care for my new tattoo?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'I provide detailed aftercare instructions with every tattoo. This includes keeping it clean, applying recommended ointments, and avoiding certain activities during the healing process.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long does healing take?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Initial healing typically takes 2-3 weeks, with complete healing occurring over 2-3 months. Following proper aftercare ensures the best results and vibrant colors.',
      },
    },
  ],
};

export default function FAQPage() {
  return (
    <>
      <BreadcrumbNav
        items={[
          { label: 'Home', href: '/' },
          { label: 'FAQ' },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData),
        }}
      />
      <FAQClient />
    </>
  );
}
