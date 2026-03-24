export const dynamic = 'force-dynamic';

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Palette, PenTool, Clock } from "lucide-react";
import { HeroSection } from "@/components/public/hero-section";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { getPublicDesigns } from "@/lib/dal/designs";

export const metadata: Metadata = {
  title: "Ink 37 Tattoos | Custom Tattoo Art by Fernando Govea",
  description:
    "Professional tattoo artistry in a clean, comfortable studio. Book a consultation for your custom tattoo design.",
  openGraph: {
    title: "Ink 37 Tattoos | Custom Tattoo Art by Fernando Govea",
    description:
      "Professional tattoo artistry in a clean, comfortable studio.",
    type: "website",
  },
};

const services = [
  {
    icon: Palette,
    title: "Consultation",
    description:
      "Discuss your vision, placement, and sizing. We will work together to create a design concept that is uniquely yours.",
  },
  {
    icon: PenTool,
    title: "Design Review",
    description:
      "Review your custom artwork before the session. We refine every detail until the design is exactly what you want.",
  },
  {
    icon: Clock,
    title: "Tattoo Session",
    description:
      "Your tattoo comes to life in a clean, comfortable environment with professional-grade equipment and inks.",
  },
];

export default async function HomePage() {
  const designs = await getPublicDesigns();
  const previewDesigns = designs.slice(0, 6);
  return (
    <>
      {/* Hero */}
      <HeroSection />

      {/* Services Preview */}
      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Our Services</h2>
          <p className="mt-2 text-muted-foreground">
            From concept to completion, we guide you through every step
          </p>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.title}>
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-secondary">
                  <service.icon className="size-5 text-foreground" />
                </div>
                <CardTitle>{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/services"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all services &rarr;
          </Link>
        </div>
      </section>

      {/* Gallery Preview */}
      <section className="bg-secondary/50 py-12">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold">Our Work</h2>
            <p className="mt-2 text-muted-foreground">
              Browse our portfolio of custom tattoo art
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
            {previewDesigns.length > 0 ? (
              previewDesigns.map((design) => (
                <div
                  key={design.id}
                  className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                >
                  <Image
                    src={design.thumbnailUrl || design.fileUrl}
                    alt={design.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
              ))
            ) : (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                Gallery Coming Soon
              </p>
            )}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/gallery"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium transition-colors hover:bg-muted"
            >
              View Full Gallery
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-neutral-950 py-16">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-2xl font-semibold text-white">
            Ready for your next piece?
          </h2>
          <p className="mt-3 text-neutral-300">
            Start with a free consultation. We will discuss your vision and
            create something unique together.
          </p>
          <Link
            href="/booking"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-brand-accent px-6 text-sm font-medium text-white transition-colors hover:bg-brand-accent/90"
          >
            Book a Consultation
          </Link>
        </div>
      </section>
    </>
  );
}
