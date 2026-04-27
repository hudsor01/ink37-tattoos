'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

const tattooImages = [
  '/images/japanese.jpg',
  '/images/traditional.jpg',
  '/images/realism.jpg',
  '/images/cover-ups.jpg',
];

function HomeClient() {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (currentImageIndex >= tattooImages.length) {
      setCurrentImageIndex(0);
    }
  }, [currentImageIndex]);

  React.useEffect(() => {
    if (isPaused) return undefined;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) =>
        prev === tattooImages.length - 1 ? 0 : prev + 1
      );
    }, 10000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Touch swipe
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0]?.clientX ?? null);
  }, []);

  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0]?.clientX ?? null);
  }, []);

  const handleTouchEnd = React.useCallback(() => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) {
      setCurrentImageIndex((prev) =>
        prev === tattooImages.length - 1 ? 0 : prev + 1
      );
    }
    if (distance < -50) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? tattooImages.length - 1 : prev - 1
      );
    }
  }, [touchStart, touchEnd]);

  // Preload first two images
  React.useEffect(() => {
    if (!isMounted) return undefined;
    const cleanups: (() => void)[] = [];
    tattooImages.slice(0, 2).forEach((src) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
      cleanups.push(() => {
        if (document.head.contains(link)) document.head.removeChild(link);
      });
    });
    return () => cleanups.forEach((fn) => fn());
  }, [isMounted]);

  return (
    <div className="min-h-[calc(100vh-5rem)] md:fixed md:inset-0 overflow-y-auto md:overflow-hidden bg-black" suppressHydrationWarning>
      <div className="h-full w-full flex flex-col md:flex-row px-4 sm:px-6 lg:px-12">
        {/* Left side - Content */}
        <div className="md:w-[45%] flex items-center justify-start pt-8 pb-4 md:py-8 pl-2 sm:pl-4 md:pl-8 overflow-hidden">
          <div className="w-full max-w-full md:max-w-2xl">
            <h1 className="artist-name text-white mb-6">
              <span className="sr-only">
                Custom Tattoos by Fernando Govea - Professional Tattoo Artist in
                Dallas Fort Worth Texas
              </span>
              <span aria-hidden="true">
                TATTOOS BY
                <br />
                <span className="fernando-gradient">FERNANDO GOVEA</span>
              </span>
            </h1>

            <p className="paragraph-large mb-6 md:mb-8">
              Crafting exceptional custom tattoos in Dallas/Fort Worth
            </p>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <motion.div
                whileHover={{
                  y: -4,
                  boxShadow: '0 8px 30px rgba(239, 68, 68, 0.5)',
                }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href="/gallery"
                  className="block px-5 py-3 md:px-6 md:py-3 border-2 border-white text-white font-semibold text-base rounded-md transition-all text-center shadow-lg relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-fernando-gradient opacity-0 group-hover:opacity-100 transition-all duration-300 -z-10" />
                  <span className="relative z-10">See My Work</span>
                </Link>
              </motion.div>

              <motion.div
                whileHover={{
                  y: -4,
                  boxShadow: '0 8px 30px rgba(239, 68, 68, 0.5)',
                }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href="/booking"
                  className="block px-5 py-3 md:px-6 md:py-3 border-2 border-white text-white font-semibold text-base rounded-md transition-all text-center shadow-lg relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-fernando-gradient opacity-0 group-hover:opacity-100 transition-all duration-300 -z-10" />
                  <span className="relative z-10">Book a Consultation</span>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Right side - Image carousel */}
        <div className="md:w-[55%] flex items-center justify-center pb-8 md:py-8 pr-2 sm:pr-4 md:pr-8">
          <div className="h-full w-full flex items-center justify-center">
            <div className="h-[50vh] sm:h-[55vh] md:h-[60vh] w-full max-w-[500px] aspect-[9/16] relative">
              <div
                className="w-full h-full relative overflow-hidden rounded-xl"
                style={{
                  filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.25))',
                }}
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <AnimatePresence mode="wait">
                  {tattooImages.map(
                    (src, index) =>
                      index === currentImageIndex && (
                        <motion.div
                          key={src}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 2.5, ease: 'easeInOut' }}
                          className="absolute inset-0"
                        >
                          {/* Gradient border */}
                          <div
                            className="absolute inset-0"
                            style={{
                              background:
                                'linear-gradient(to right, #ef4444, #f97316)',
                              borderRadius: '0.75rem',
                              padding: '2px',
                            }}
                          >
                            <div className="absolute inset-[2px] rounded-[calc(0.75rem-2px)] overflow-hidden z-10">
                              <Image
                                src={src}
                                alt={`Tattoo artwork by Fernando Govea ${index + 1}`}
                                fill
                                sizes="(max-width: 768px) 90vw, 50vw"
                                priority={index === 0}
                                quality={90}
                                className="object-cover"
                                draggable={false}
                              />
                              <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent z-10" />
                            </div>
                          </div>
                        </motion.div>
                      )
                  )}
                </AnimatePresence>

                {/* Dot indicators */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
                  {tattooImages.map((imagePath, index) => (
                    <button
                      key={imagePath}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? 'bg-white w-4'
                          : 'bg-white/50 hover:bg-white/80'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>

                {/* Arrow controls */}
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center z-20 transition-all"
                  onClick={() =>
                    setCurrentImageIndex((prev) =>
                      prev === 0 ? tattooImages.length - 1 : prev - 1
                    )
                  }
                  aria-label="Previous image"
                >
                  &#10094;
                </button>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center z-20 transition-all"
                  onClick={() =>
                    setCurrentImageIndex((prev) =>
                      prev === tattooImages.length - 1 ? 0 : prev + 1
                    )
                  }
                  aria-label="Next image"
                >
                  &#10095;
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(HomeClient);
