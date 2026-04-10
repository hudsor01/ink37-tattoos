'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const navigationLinks = [
  { href: '/about', label: 'About' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/services', label: 'Services' },
  { href: '/contact', label: 'Contact' },
];

export function PublicNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Spacer to prevent content from being hidden under fixed navbar */}
      <div className="h-20 sm:h-24 md:h-28" />

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-black/90 backdrop-blur-sm shadow-md py-2'
            : 'bg-black/80 backdrop-blur-sm py-3'
        }`}
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="relative z-20 shrink-0 group">
              <div className="flex flex-col items-start leading-none">
                <span className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
                  <span className="fernando-gradient">INK</span>
                  <span className="text-white ml-0.5">37</span>
                </span>
                <span className="text-[0.5rem] sm:text-[0.6rem] md:text-xs font-semibold tracking-[0.35em] text-zinc-400 uppercase mt-0.5 group-hover:text-white transition-colors">
                  TATTOOS
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center justify-center flex-1 space-x-3 lg:space-x-4">
              {navigationLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-md text-sm lg:text-base font-medium text-white transition-all duration-300 ${
                    pathname === link.href
                      ? 'bg-fernando-gradient hover:opacity-90'
                      : 'hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Book Now Button */}
            <div className="hidden md:block shrink-0">
              <Link
                href="/booking"
                className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm lg:text-base font-medium text-white bg-fernando-gradient hover:opacity-90 transition-opacity"
              >
                Book Now
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-white focus:outline-none shrink-0"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden bg-black/95 backdrop-blur-md shadow-lg"
            >
              <nav className="container mx-auto px-4 py-4 flex flex-col space-y-3">
                {navigationLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-white py-2 px-4 rounded-md transition-all duration-300 ${
                      pathname === link.href
                        ? 'bg-fernando-gradient font-medium'
                        : 'hover:bg-white/5'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/booking"
                  className="text-white py-2 px-4 rounded-md bg-fernando-gradient text-center font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Book Now
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
