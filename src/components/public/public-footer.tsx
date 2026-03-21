import Link from "next/link";
import { Instagram, Facebook } from "lucide-react";

const quickLinks = [
  { href: "/gallery", label: "Gallery" },
  { href: "/services", label: "Services" },
  { href: "/booking", label: "Booking" },
  { href: "/contact", label: "Contact" },
];

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-900 text-white py-12">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Column 1: Brand */}
          <div>
            <h3 className="text-lg font-semibold tracking-tight">
              INK 37 TATTOOS
            </h3>
            <p className="mt-3 text-sm text-neutral-400 leading-relaxed">
              Professional tattoo artistry by Fernando Govea. Custom designs
              created in a clean, comfortable studio environment.
            </p>
            <p className="mt-4 text-xs text-neutral-500">
              &copy; {currentYear} Ink 37 Tattoos. All rights reserved.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
              Quick Links
            </h3>
            <ul className="mt-3 space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
              Contact
            </h3>
            <div className="mt-3 space-y-2 text-sm text-neutral-400">
              <p>San Antonio, TX</p>
              <p>
                <a
                  href="mailto:info@ink37tattoos.com"
                  className="transition-colors hover:text-white"
                >
                  info@ink37tattoos.com
                </a>
              </p>
              <p>
                <a
                  href="tel:+12105551037"
                  className="transition-colors hover:text-white"
                >
                  (210) 555-1037
                </a>
              </p>
            </div>
            <div className="mt-4 flex gap-4">
              <a
                href="https://instagram.com/ink37tattoos"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 transition-colors hover:text-brand-accent"
                aria-label="Instagram"
              >
                <Instagram className="size-5" />
              </a>
              <a
                href="https://facebook.com/ink37tattoos"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 transition-colors hover:text-brand-accent"
                aria-label="Facebook"
              >
                <Facebook className="size-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
