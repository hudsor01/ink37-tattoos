import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageCircle, Palette, Pen, RefreshCw } from 'lucide-react';
import { ServiceCard } from '@/components/public/service-card';
import { ProcessSteps } from '@/components/public/process-steps';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Services | Ink 37 Tattoos',
  description:
    'Tattoo services including consultations, design reviews, tattoo sessions, and touch-ups at Ink 37 Tattoos.',
  openGraph: {
    title: 'Services | Ink 37 Tattoos',
    description:
      'Tattoo services including consultations, design reviews, tattoo sessions, and touch-ups at Ink 37 Tattoos.',
  },
};

const SERVICES = [
  {
    icon: MessageCircle,
    title: 'Consultation',
    description:
      'Free 30-minute consultation to discuss your tattoo idea. We\'ll cover design direction, placement, sizing, and pricing.',
    details: ['30 minutes', 'Free', 'In-person or virtual'],
  },
  {
    icon: Palette,
    title: 'Design Review',
    description:
      'Review your custom design before your session. We refine every detail until it\'s exactly what you want.',
    details: ['Design revisions included', 'Digital mockup provided'],
  },
  {
    icon: Pen,
    title: 'Tattoo Session',
    description:
      'Your tattoo brought to life in a clean, professional studio. Sessions range from 1-8 hours depending on complexity.',
    details: ['Sterile environment', 'Premium inks', 'Aftercare kit included'],
  },
  {
    icon: RefreshCw,
    title: 'Touch-Up',
    description:
      'Free touch-up within 3 months of your session. We ensure your tattoo heals perfectly.',
    details: ['Free within 3 months', '30-60 minutes'],
  },
] as const;

export default function ServicesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 space-y-16">
      {/* Services Section */}
      <section>
        <h1 className="text-2xl font-semibold mb-2">Our Services</h1>
        <p className="text-muted-foreground mb-8">
          From initial concept to finished piece, we guide you through every step.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SERVICES.map((service) => (
            <ServiceCard
              key={service.title}
              icon={service.icon}
              title={service.title}
              description={service.description}
              details={[...service.details]}
            />
          ))}
        </div>
      </section>

      {/* Process Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-2 text-center">Our Process</h2>
        <p className="text-muted-foreground mb-8 text-center">
          Every great tattoo follows a proven process.
        </p>
        <ProcessSteps />
      </section>

      {/* Pricing Section */}
      <section className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Pricing</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
          Pricing varies based on design complexity, size, placement, and session time.
          We offer competitive hourly rates and project-based pricing for larger pieces.
          Book a free consultation for an accurate quote tailored to your vision.
        </p>
        <Button
          className="bg-[--brand-accent] hover:bg-[--brand-accent]/90 text-white"
          size="lg"
          render={<Link href="/booking" />}
        >
          Book a Consultation
        </Button>
      </section>
    </div>
  );
}
