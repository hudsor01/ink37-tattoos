import type { Metadata } from 'next';
import { CalEmbed } from '@/components/public/cal-embed';
import { BreadcrumbNav } from '@/components/public/breadcrumb-nav';

export const metadata: Metadata = {
  title: 'Book an Appointment | Ink 37 Tattoos',
  description:
    'Book a consultation, design review, or tattoo session at Ink 37 Tattoos.',
  openGraph: {
    title: 'Book an Appointment | Ink 37 Tattoos',
    description:
      'Book a consultation, design review, or tattoo session at Ink 37 Tattoos.',
  },
};

export default function BookingPage() {
  const calLink = process.env.NEXT_PUBLIC_CAL_USERNAME ?? 'ink37';

  return (
    <>
    <BreadcrumbNav
      items={[
        { label: 'Home', href: '/' },
        { label: 'Book Consultation' },
      ]}
    />
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
      <h1 className="text-2xl font-semibold mb-2">Book an Appointment</h1>
      <p className="text-muted-foreground mb-8">
        Ready for your next piece? Start with a free consultation.
      </p>

      <div className="min-h-[600px] rounded-lg border bg-card">
        <CalEmbed calLink={calLink} />
      </div>

      <p className="text-sm text-muted-foreground text-center mt-6">
        Having trouble with the booking widget?{' '}
        <a
          href={`https://cal.com/${calLink}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Book directly on Cal.com
        </a>
      </p>
    </div>
    </>
  );
}
