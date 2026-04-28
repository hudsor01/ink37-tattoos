import { cacheLife } from 'next/cache';
import Link from 'next/link';

/**
 * Cached cross-request -- footer content (including the copyright year) is
 * the same for every visitor and only needs to revalidate occasionally.
 * Per Next 16 Cache Components, `new Date()` in a Server Component must
 * either follow `connection()` or live inside a `'use cache'` boundary.
 */
export async function PublicFooter() {
  'use cache';
  cacheLife('weeks');

  return (
    <footer className="bg-black border-t border-zinc-800 py-4">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col items-center space-y-3">
          {/* Quick Links */}
          <div className="flex items-center space-x-6 text-sm">
            <Link
              href="/gallery"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Gallery
            </Link>
            <Link
              href="/about"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Contact
            </Link>
            <Link
              href="/booking"
              className="text-zinc-400 hover:text-orange-400 transition-colors"
            >
              Book Consultation
            </Link>
          </div>

          {/* Footer Info */}
          <div className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-4 text-xs text-zinc-500">
            <span>&copy; {new Date().getFullYear()} Ink 37 Tattoos. All rights reserved.</span>
            <span className="hidden md:inline">&bull;</span>
            <span>Dallas-Fort Worth, Texas</span>
            <span className="hidden md:inline">&bull;</span>
            <span>By appointment only</span>
          </div>

          {/* Built-by credit */}
          <div className="text-xs text-zinc-600">
            Built by{' '}
            <a
              href="https://hudsondigitalsolutions.com"
              className="hover:text-zinc-300 transition-colors underline underline-offset-2"
            >
              Hudson Digital Solutions
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
