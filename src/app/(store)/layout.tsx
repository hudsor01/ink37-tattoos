'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import { Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { CartIcon } from '@/components/store/cart-icon';
import { CartDrawer } from '@/components/store/cart-drawer';
import { PageTransition } from '@/components/page-transition';

const navLinks = [
  { href: '/gallery', label: 'Gallery' },
  { href: '/services', label: 'Services' },
  { href: '/store', label: 'Shop' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
];

function StoreNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full h-16 z-50 bg-white/95 backdrop-blur border-b border-border">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          INK 37
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm transition-colors hover:text-foreground',
                pathname === link.href || (link.href === '/store' && pathname?.startsWith('/store'))
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <CartIcon />
          <Link
            href="/booking"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-accent px-4 text-sm font-medium text-white transition-colors hover:bg-brand-accent/90"
          >
            Book a Consultation
          </Link>
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2">
          <CartIcon />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden" />
              }
            >
              <Menu className="size-5" />
              <span className="sr-only">Open menu</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetHeader className="border-b px-6 py-4">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col px-6 py-4">
                {navLinks.map((link) => (
                  <SheetClose
                    key={link.href}
                    render={
                      <Link
                        href={link.href}
                        className={cn(
                          'flex min-h-[44px] items-center py-3 text-base font-medium transition-colors hover:text-foreground',
                          pathname === link.href
                            ? 'text-foreground font-semibold'
                            : 'text-muted-foreground'
                        )}
                      />
                    }
                  >
                    {link.label}
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto border-t px-6 py-4">
                <SheetClose
                  render={
                    <Link
                      href="/booking"
                      className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-brand-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-accent/90"
                    />
                  }
                >
                  Book a Consultation
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function StoreFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <Link href="/" className="text-lg font-semibold tracking-tight">
              INK 37
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              Professional tattoo artistry in a welcoming environment.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Quick Links</h3>
            <ul className="mt-2 space-y-1.5">
              {[
                { href: '/gallery', label: 'Gallery' },
                { href: '/services', label: 'Services' },
                { href: '/store', label: 'Shop' },
                { href: '/booking', label: 'Book Now' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Contact</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li>
                <Link href="/contact" className="hover:text-foreground transition-colors">
                  Get in Touch
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-foreground transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
          <div>&copy; 2026 Ink 37 Tattoos. All rights reserved.</div>
          <div className="mt-1">
            Built by{' '}
            <a
              href="https://hudsondigitalsolutions.com"
              className="hover:text-foreground transition-colors underline underline-offset-2"
            >
              Hudson Digital Solutions
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <StoreNav />
      </Suspense>
      <main className="pt-16 min-h-screen">
        <Suspense fallback={null}>
          <PageTransition>{children}</PageTransition>
        </Suspense>
      </main>
      <StoreFooter />
      <CartDrawer />
    </>
  );
}
