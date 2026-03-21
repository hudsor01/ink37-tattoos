"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/public/mobile-nav";

const navLinks = [
  { href: "/gallery", label: "Gallery" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function PublicNav() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 w-full h-16 z-50 bg-white/95 backdrop-blur border-b border-border">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="text-xl font-semibold tracking-tight">
          INK 37
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm transition-colors hover:text-foreground",
                pathname === link.href
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center">
          <Link
            href="/booking"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-accent px-4 text-sm font-medium text-white transition-colors hover:bg-brand-accent/90"
          >
            Book a Consultation
          </Link>
        </div>

        {/* Mobile Menu */}
        <MobileNav />
      </div>
    </header>
  );
}
