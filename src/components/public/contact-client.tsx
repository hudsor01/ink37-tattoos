'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ContactForm } from '@/components/public/contact-form';
import {
  Mail, Instagram, MapPin, Clock, ChevronRight, Phone,
  Info, HelpCircle
} from 'lucide-react';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0 } }
};

const faqItems = [
  {
    question: 'How much does a tattoo cost?',
    answer: 'Pricing depends on size, detail, and placement. Small pieces start at $100. For an accurate quote, contact me with your design idea.',
  },
  {
    question: "What's your availability like?",
    answer: "I'm usually booked 2-3 weeks out. Contact me early for your preferred date. Consultations are scheduled within 1 week.",
  },
  {
    question: 'Do you do cover-ups?',
    answer: 'Yes, I specialize in cover-ups. Send me a photo of your existing tattoo to discuss possibilities.',
  },
];

export default function ContactClient() {
  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Page Title */}
        <motion.div
          className="mb-16 text-center"
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-balance">Get In Touch</h1>
          <p className="text-lg text-silver max-w-2xl mx-auto mb-6 text-pretty">
            Have questions? Ready to schedule a consultation? Reach out today.
          </p>
          <div className="h-1 w-24 mx-auto bg-fernando-gradient" />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form Section */}
          <motion.div
            className="lg:col-span-2 order-2 lg:order-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-black/50 backdrop-blur-sm rounded-lg border border-white/10 shadow-xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center text-white">
                <Phone className="mr-3 text-fernando-red" size={24} />
                Send Me a Message
              </h2>

              <p className="text-silver text-sm mb-6 text-pretty">
                Have a question or want to discuss a custom tattoo design? Fill out the form below
                and I&apos;ll get back to you as soon as possible.
              </p>

              <ContactForm />
            </div>
          </motion.div>

          {/* Contact Info Section */}
          <motion.div
            className="order-1 lg:order-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-black/50 backdrop-blur-sm rounded-lg border border-white/10 shadow-xl p-6 md:p-8 h-full flex flex-col">
              <h2 className="text-xl font-bold mb-6 flex items-center text-white">
                <Info className="mr-3 text-fernando-red" size={24} />
                Contact Information
              </h2>

              <div className="space-y-6">
                {/* Social Links */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Connect With Me</h3>
                  <div className="flex items-center space-x-6">
                    <motion.a
                      href="mailto:contact@ink37tattoos.com"
                      className="w-16 h-16 rounded-full bg-fernando-red/20 flex items-center justify-center text-fernando-red hover:text-white hover:bg-fernando-red/40 transition-colors border border-fernando-red/30 hover:border-fernando-orange"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      title="Send Email"
                    >
                      <Mail className="w-7 h-7" />
                    </motion.a>

                    <motion.a
                      href="https://instagram.com/fennyg83"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600/20 via-pink-500/20 to-orange-400/20 flex items-center justify-center text-pink-400 hover:text-white transition-colors border border-pink-500/30 hover:border-pink-400"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      title="Follow on Instagram"
                    >
                      <Instagram className="w-7 h-7" />
                    </motion.a>
                  </div>
                </div>

                {/* Working Hours */}
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-fernando-red/20 flex items-center justify-center text-fernando-red mr-4">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Working Hours</h3>
                    <p className="text-white/70">By appointment only</p>
                    <p className="text-xs text-white/50 mt-1">
                      Flexible scheduling for your convenience
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-fernando-red/20 flex items-center justify-center text-fernando-red mr-4">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Location</h3>
                    <p className="text-white/70">Dallas/Fort Worth metroplex</p>
                    <p className="text-xs text-white/50 mt-1">
                      Exact location details shared after booking confirmation
                    </p>
                  </div>
                </div>
              </div>

              {/* Book Button */}
              <div className="mt-8 mb-6">
                <Link
                  href="/booking"
                  className="w-full flex items-center justify-center bg-fernando-gradient hover:opacity-90 transition-all duration-300 text-white font-medium py-3 px-4 rounded-md group"
                >
                  Book a Consultation
                  <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              {/* FAQ Section */}
              <div className="mt-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <HelpCircle className="mr-2 text-fernando-red" size={20} />
                  Quick FAQs
                </h3>

                <motion.div
                  className="space-y-5"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {faqItems.map((faq) => (
                    <motion.div
                      key={faq.question}
                      className="bg-black/30 border border-white/10 rounded-lg p-6 hover:border-fernando-red/30 transition-colors"
                      variants={fadeInUp}
                    >
                      <h4 className="font-medium text-white mb-3 text-base flex items-center">
                        <span className="w-7 h-7 rounded-full bg-fernando-red/20 flex items-center justify-center text-fernando-red mr-3 text-sm font-semibold">
                          Q
                        </span>
                        {faq.question}
                      </h4>
                      <p className="text-white/70 text-sm pl-10 leading-relaxed text-pretty">{faq.answer}</p>
                    </motion.div>
                  ))}
                </motion.div>

                <div className="mt-4 text-center">
                  <Link href="/faq" className="text-fernando-red hover:text-fernando-orange text-sm font-medium">
                    View all FAQs
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Closing CTA Section */}
        <motion.section
          className="py-16 mt-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <div className="bg-gradient-to-br from-black to-black/90 rounded-2xl border border-fernando-red/20 shadow-xl p-8 md:p-12">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Ready to Bring Your Vision to Life?
              </h2>
              <p className="text-white/80 mb-8">
                Whether you have a clear design in mind or need help developing your concept, I&apos;m
                here to guide you through every step of the tattoo process.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/booking"
                  className="inline-flex items-center justify-center bg-fernando-gradient hover:opacity-90 text-white font-semibold py-3 px-6 rounded-lg group"
                >
                  Book a Consultation
                  <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/gallery"
                  className="inline-flex items-center justify-center border-2 border-fernando-red text-fernando-red hover:bg-fernando-red/10 font-semibold py-3 px-6 rounded-lg group"
                >
                  <span className="fernando-gradient font-semibold">View My Gallery</span>
                  <ChevronRight className="ml-2 h-4 w-4 text-fernando-orange transition-all duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
