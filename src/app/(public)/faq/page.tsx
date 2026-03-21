import type { Metadata } from "next";
import Link from "next/link";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "FAQ | Ink 37 Tattoos",
  description:
    "Frequently asked questions about tattoo appointments, pricing, aftercare, and studio policies at Ink 37 Tattoos.",
};

const faqItems = [
  {
    question: "How do I book an appointment?",
    answer:
      "Start by booking a free consultation through our online scheduling system. During the consultation, we will discuss your design ideas, placement, sizing, and pricing. Once we have a plan, we will schedule your tattoo session. You can book your consultation on our booking page.",
  },
  {
    question: "How much does a tattoo cost?",
    answer:
      "Tattoo pricing varies based on size, complexity, detail level, placement, and the time required. Small pieces may start at a flat rate, while larger or more detailed work is typically priced by the hour. We provide a clear estimate during your consultation so there are no surprises.",
  },
  {
    question: "How should I prepare for my tattoo session?",
    answer:
      "Get a good night's sleep, eat a full meal before your appointment, and stay well hydrated. Wear comfortable clothing that allows easy access to the area being tattooed. Avoid alcohol and blood-thinning medications for at least 24 hours before your session. Arrive with clean skin, free of lotions or sunburn.",
  },
  {
    question: "What is the aftercare process?",
    answer:
      "Aftercare is crucial for a great result. Keep your new tattoo clean and moisturized following the specific instructions provided after your session. Avoid submerging it in water (pools, baths, hot tubs) for at least 2 weeks. Stay out of direct sunlight and do not pick or scratch the healing area. We will provide detailed aftercare instructions and are always available for questions during healing.",
  },
  {
    question: "Do you do cover-ups?",
    answer:
      "Yes, cover-up tattoos are one of our specialties. Cover-ups require careful planning to ensure the new design effectively conceals the existing tattoo while looking great on its own. Book a consultation so we can assess your existing tattoo and discuss design options.",
  },
  {
    question: "What styles do you specialize in?",
    answer:
      "We work across a wide range of styles including Traditional, Neo-Traditional, Realism, Blackwork, Illustrative, Watercolor, Geometric, Japanese, Lettering, and Minimalist designs. Browse our gallery to see examples of each style and find inspiration for your piece.",
  },
  {
    question: "How old do I have to be to get a tattoo?",
    answer:
      "You must be at least 18 years old with a valid government-issued photo ID to get a tattoo at our studio. No exceptions are made, regardless of parental consent. We verify identification before every session.",
  },
  {
    question: "What forms of payment do you accept?",
    answer:
      "We accept cash and all major credit and debit cards. Payment is due at the end of your session. For larger pieces requiring multiple sessions, payment is collected at the end of each individual session.",
  },
  {
    question: "Can I bring a friend?",
    answer:
      "Yes, you are welcome to bring one guest for moral support. Due to studio space and to maintain a calm environment, we ask that you limit it to one person. Children are not permitted in the tattoo area during sessions.",
  },
  {
    question: "What if I need to reschedule?",
    answer:
      "We understand that plans change. Please provide at least 48 hours notice if you need to reschedule your appointment. Late cancellations or no-shows may result in a rebooking fee. Contact us as soon as possible if your plans change and we will do our best to accommodate you.",
  },
];

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      {/* Page Header */}
      <h1 className="text-2xl font-semibold md:text-3xl">
        Frequently Asked Questions
      </h1>
      <p className="mt-2 text-muted-foreground">
        Everything you need to know before your visit.
      </p>

      {/* FAQ Accordion */}
      <div className="mt-8">
        <Accordion>
          {faqItems.map((item, index) => (
            <AccordionItem key={index} value={`faq-${index}`}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground leading-relaxed">
                  {item.answer}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Bottom CTAs */}
      <section className="mt-12 rounded-xl border border-border bg-card p-6 text-center">
        <h2 className="text-lg font-semibold">Still have questions?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We are happy to help. Reach out or book a consultation to discuss your
          ideas in person.
        </p>
        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/contact"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Contact Us
          </Link>
          <Link
            href="/booking"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-accent px-5 text-sm font-medium text-white transition-colors hover:bg-brand-accent/90"
          >
            Book a Consultation
          </Link>
        </div>
      </section>
    </div>
  );
}
