"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <section className="relative flex min-h-[70vh] items-center justify-center bg-neutral-950 px-4">
      <motion.div
        className="mx-auto max-w-4xl text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h1 className="text-[2rem] font-semibold leading-tight text-white md:text-[2.5rem]">
          Custom Tattoo Art by Fernando Govea
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-neutral-300">
          Professional tattoo artistry in a clean, comfortable studio. Every
          piece is a collaboration.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/booking"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-accent px-6 text-sm font-medium text-white transition-colors hover:bg-brand-accent/90"
          >
            Book a Consultation
          </Link>
          <Link
            href="/gallery"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-white/30 px-6 text-sm font-medium text-white transition-colors hover:border-white hover:bg-white/10"
          >
            View Gallery
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
