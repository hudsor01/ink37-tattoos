import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | Ink 37 Tattoos",
  description:
    "Learn about Ink 37 Tattoos studio, our artist Fernando Govea, and our commitment to custom tattoo artistry.",
};

const processSteps = [
  {
    step: 1,
    title: "Consultation",
    description:
      "We start with a conversation about your vision. Share your ideas, reference images, and preferred placement. This is a collaborative process where we explore possibilities and set expectations for your piece.",
  },
  {
    step: 2,
    title: "Design",
    description:
      "Based on our consultation, a custom design is created specifically for you. We will review it together and make revisions until every detail is exactly right. Your tattoo should be as unique as you are.",
  },
  {
    step: 3,
    title: "Session",
    description:
      "On the day of your appointment, you will be in a clean, comfortable environment. We use professional-grade equipment, premium inks, and follow strict hygiene protocols throughout your session.",
  },
  {
    step: 4,
    title: "Aftercare",
    description:
      "Proper aftercare is essential for a great result. You will receive detailed instructions and ongoing support to ensure your tattoo heals beautifully and looks its best for years to come.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      {/* Page Header */}
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold md:text-3xl">
          About Ink 37 Tattoos
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          Professional tattoo artistry rooted in craftsmanship, creativity, and
          collaboration.
        </p>
      </div>

      {/* Studio Description */}
      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">The Studio</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Ink 37 Tattoos is a private tattoo studio in San Antonio, Texas,
              built around the belief that great tattoos come from great
              conversations. Every piece begins with understanding your story,
              your style, and your vision.
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              The studio is designed for comfort and focus. Clean, well-lit, and
              equipped with professional-grade tools, it provides the ideal
              environment for creating lasting art on skin.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold">The Artist</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Fernando Govea brings years of experience and a deep passion for
              the craft to every piece. Specializing in a range of styles from
              bold traditional work to detailed realism, Fernando approaches each
              tattoo as a unique collaboration with the client.
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Whether it is your first tattoo or an addition to an existing
              collection, you will receive the same level of care, attention to
              detail, and artistic dedication.
            </p>
          </div>
        </div>

        <div className="flex items-start justify-center rounded-xl bg-secondary/50 p-8">
          <div className="text-center">
            <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-secondary">
              <span className="text-3xl font-semibold text-muted-foreground">
                FG
              </span>
            </div>
            <p className="mt-4 text-lg font-semibold">Fernando Govea</p>
            <p className="text-sm text-muted-foreground">
              Owner &amp; Artist
            </p>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground leading-relaxed">
              &ldquo;Every tattoo tells a story. My job is to make sure yours is
              told exactly the way you envision it.&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Process Steps */}
      <section className="mt-16">
        <h2 className="text-2xl font-semibold">Our Process</h2>
        <p className="mt-2 text-muted-foreground">
          From first conversation to final result, here is how we work together.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {processSteps.map((item) => (
            <div key={item.step} className="relative">
              <div className="flex size-10 items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white">
                {item.step}
              </div>
              <h3 className="mt-3 text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-16 rounded-xl bg-neutral-950 px-6 py-12 text-center">
        <h2 className="text-xl font-semibold text-white">
          Ready to start your tattoo journey?
        </h2>
        <p className="mt-2 text-neutral-300">
          Book a free consultation to discuss your ideas.
        </p>
        <Link
          href="/booking"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-brand-accent px-6 text-sm font-medium text-white transition-colors hover:bg-brand-accent/90"
        >
          Book a Consultation
        </Link>
      </section>
    </div>
  );
}
