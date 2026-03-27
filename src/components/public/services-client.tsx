'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Palette, Heart, Brush, Clock, Shield, Award, Sparkles, Eye,
  Calendar, Users, ArrowRight
} from 'lucide-react';
import type { ComponentType } from 'react';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

interface ServiceFeature {
  id: string;
  title: string;
  shortDescription: string;
  features: string[];
  icon: ComponentType<{ className?: string }>;
  priceRange: string;
  duration: string;
  category: string;
  featured?: boolean;
}

const premiumServices: ServiceFeature[] = [
  {
    id: 'custom-designs',
    title: 'Custom Tattoo Designs',
    shortDescription: 'Unique, personalized artwork created exclusively for you',
    features: [
      'One-on-one design consultation',
      'Unlimited revision rounds',
      'Original artwork ownership',
      'Digital design delivery',
      'Sizing and placement guidance'
    ],
    icon: Palette,
    priceRange: '$150 - $2000+',
    duration: '2-8 hours',
    category: 'Design & Planning',
    featured: true
  },
  {
    id: 'traditional',
    title: 'Traditional American Tattoos',
    shortDescription: 'Classic bold lines and vibrant colors in timeless American style',
    features: [
      'Bold, clean line work',
      'Traditional color palette',
      'Timeless design elements',
      'Flash sheet options available',
      'Quick turnaround time'
    ],
    icon: Heart,
    priceRange: '$100 - $800',
    duration: '1-4 hours',
    category: 'Traditional',
    featured: true
  },
  {
    id: 'japanese',
    title: 'Japanese Traditional Tattoos',
    shortDescription: 'Authentic Japanese artistry with rich cultural symbolism',
    features: [
      'Authentic Japanese techniques',
      'Traditional motifs and symbolism',
      'Large-scale compositions',
      'Cultural accuracy and respect',
      'Master-level craftsmanship'
    ],
    icon: Brush,
    priceRange: '$200 - $3000+',
    duration: '3-12 hours',
    category: 'Traditional',
    featured: true
  },
  {
    id: 'realism',
    title: 'Photorealistic Tattoos',
    shortDescription: 'Incredibly detailed artwork that looks like photographs on skin',
    features: [
      'Photographic detail level',
      'Advanced shading techniques',
      'Color and black & grey options',
      'Portrait specialization',
      'Reference photo consultation'
    ],
    icon: Eye,
    priceRange: '$300 - $2500+',
    duration: '4-10 hours',
    category: 'Modern',
    featured: true
  }
];

const qualityFeatures = [
  {
    icon: Shield,
    title: 'Sterile Environment',
    description: 'Hospital-grade sterilization and single-use equipment ensure your safety and peace of mind.'
  },
  {
    icon: Award,
    title: 'Award-Winning Artist',
    description: 'Fernando has earned numerous awards and recognition in the tattoo industry.'
  },
  {
    icon: Sparkles,
    title: 'Premium Inks',
    description: 'We use only the highest quality, FDA-approved inks for vibrant, long-lasting results.'
  },
  {
    icon: Clock,
    title: 'Lifetime Touch-ups',
    description: 'Free touch-ups within the first year to ensure your tattoo looks perfect forever.'
  }
];

const processSteps = [
  {
    step: 1,
    title: 'Consultation',
    description: 'Discuss your vision, style preferences, and placement options with our expert artist.',
    icon: Users,
    duration: '30-60 mins'
  },
  {
    step: 2,
    title: 'Design Creation',
    description: 'Custom artwork is created based on your consultation, with revisions until perfect.',
    icon: Palette,
    duration: '1-7 days'
  },
  {
    step: 3,
    title: 'Appointment',
    description: 'Your tattoo session in our comfortable, sterile studio environment.',
    icon: Calendar,
    duration: '1-8 hours'
  },
  {
    step: 4,
    title: 'Aftercare',
    description: 'Comprehensive aftercare instructions and follow-up support for optimal healing.',
    icon: Heart,
    duration: '2-4 weeks'
  }
];

export default function ServicesClient() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative pt-8 pb-16 md:pt-12 md:pb-20 overflow-hidden">
        <div className="container relative mx-auto px-4 text-center">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Professional Tattoo Services
            </h1>

            <p className="text-xl text-silver mb-8 leading-relaxed">
              Experience exceptional artistry with our comprehensive range of tattoo services.
              From custom designs to traditional classics, we bring your vision to life with
              unmatched skill and attention to detail.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/booking"
                className="inline-flex items-center justify-center bg-fernando-gradient hover:opacity-90 transition-opacity text-white font-semibold px-8 py-3 rounded-lg text-lg"
              >
                Book Consultation
              </Link>

              <Link
                href="/gallery"
                className="inline-flex items-center justify-center rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors px-8 py-3 text-lg font-medium"
              >
                View Our Work
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Services Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Our Signature Services
            </h2>
            <p className="text-lg text-silver max-w-2xl mx-auto">
              Choose from our carefully curated selection of tattoo styles,
              each delivered with the highest standards of artistry and professionalism.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8"
          >
            {premiumServices.map((service, index) => {
              const IconComponent = service.icon;

              return (
                <motion.div
                  key={service.id}
                  variants={cardVariants}
                  transition={{ delay: index * 0.1 }}
                  className="h-full"
                >
                  <Card className="h-full group hover:shadow-2xl transition-all duration-500 border-white/10 hover:border-fernando-red/20 hover:-translate-y-1">
                    {service.featured && (
                      <div className="absolute -top-2 -right-2 z-10">
                        <Badge className="bg-fernando-gradient text-white">
                          Featured
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-fernando-red/10 group-hover:bg-fernando-red/20 transition-colors">
                          <IconComponent className="h-6 w-6 text-fernando-red" />
                        </div>
                        <Badge variant="outline" className="text-xs border-white/20 text-silver">
                          {service.category}
                        </Badge>
                      </div>

                      <CardTitle className="text-xl font-bold text-white group-hover:text-fernando-red transition-colors">
                        {service.title}
                      </CardTitle>

                      <p className="text-silver text-sm leading-relaxed">
                        {service.shortDescription}
                      </p>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col">
                      <div className="space-y-4 flex-1">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-fernando-red" />
                            <span className="text-silver">{service.duration}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-fernando-red">{service.priceRange}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-semibold text-white">What&apos;s Included:</h4>
                          <ul className="space-y-1">
                            {service.features.slice(0, 3).map((feature) => (
                              <li key={feature} className="text-sm text-silver flex items-start gap-2">
                                <ArrowRight className="h-3 w-3 text-fernando-red mt-0.5 flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="pt-4 mt-auto">
                        <Link
                          href="/booking"
                          className="block w-full text-center bg-fernando-gradient hover:opacity-90 transition-opacity text-white font-medium py-2 px-4 rounded-md text-sm"
                        >
                          Book This Service
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Quality Features */}
      <section className="py-16 bg-charcoal/20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Choose Ink 37 Tattoos
            </h2>
            <p className="text-lg text-silver max-w-2xl mx-auto">
              Experience the difference that comes with choosing a premium tattoo studio
              committed to excellence in every aspect of the tattooing process.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {qualityFeatures.map((feature) => {
              const IconComponent = feature.icon;

              return (
                <motion.div
                  key={feature.title}
                  variants={fadeInUp}
                  className="text-center group"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-fernando-red/10 rounded-full mb-4 group-hover:bg-fernando-red/20 transition-colors">
                    <IconComponent className="h-8 w-8 text-fernando-red" />
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-3">
                    {feature.title}
                  </h3>

                  <p className="text-silver leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Our Tattoo Process
            </h2>
            <p className="text-lg text-silver max-w-2xl mx-auto">
              From initial consultation to final aftercare, we guide you through
              every step of your tattoo journey with professionalism and care.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            {processSteps.map((step, index) => {
              const IconComponent = step.icon;

              return (
                <motion.div
                  key={step.step}
                  variants={fadeInUp}
                  className="relative"
                >
                  {index < processSteps.length - 1 && (
                    <div className="absolute left-8 top-16 w-0.5 h-16 bg-gradient-to-b from-fernando-red to-fernando-red/30 hidden md:block" />
                  )}

                  <Card className="mb-8 hover:shadow-lg transition-shadow border-white/10">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="relative">
                            <div className="w-16 h-16 bg-fernando-red/10 rounded-full flex items-center justify-center border-2 border-fernando-red/20">
                              <IconComponent className="h-7 w-7 text-fernando-red" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-fernando-red text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {step.step}
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-semibold text-white">
                              {step.title}
                            </h3>
                            <span className="text-sm text-fernando-red font-medium bg-fernando-red/10 px-2 py-1 rounded">
                              {step.duration}
                            </span>
                          </div>

                          <p className="text-silver leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Call-to-Action Section */}
      <section className="py-16 bg-charcoal/20">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Start Your Tattoo Journey?
            </h2>

            <p className="text-lg text-silver mb-8">
              Book a consultation today and let&apos;s discuss how we can bring your
              tattoo vision to life with our expert artistry and professional service.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/booking"
                className="inline-flex items-center justify-center bg-fernando-gradient hover:opacity-90 transition-opacity text-white font-semibold px-8 py-3 rounded-lg text-lg"
              >
                Schedule Consultation
              </Link>

              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors px-8 py-3 text-lg font-medium"
              >
                Ask Questions
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
