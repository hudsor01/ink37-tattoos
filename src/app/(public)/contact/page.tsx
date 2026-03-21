import type { Metadata } from 'next';
import { ContactForm } from '@/components/public/contact-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, MapPin, Phone, Clock, Instagram } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with Ink 37 Tattoos. Send us a message about your tattoo idea or any questions.',
};

export default function ContactPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
      <h1 className="text-4xl font-semibold mb-2">Get in Touch</h1>
      <p className="text-muted-foreground mb-12">
        Have a question or want to discuss your tattoo idea? Send us a message
        and we will get back to you within 24 hours.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Contact Form */}
        <div>
          <ContactForm />
        </div>

        {/* Contact Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Studio Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-3">
                <MapPin className="size-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">
                    Studio address coming soon
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="size-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">
                    info@ink37tattoos.com
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="size-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">
                    Contact via form or social media
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="size-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Hours</p>
                  <p className="text-sm text-muted-foreground">
                    By appointment only
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Instagram className="size-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Social</p>
                  <a
                    href="https://instagram.com/ink37tattoos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    @ink37tattoos
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Before You Visit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ready for your next piece? Start with a free consultation. We
                will discuss your idea, placement, sizing, and provide a quote.
                Walk-ins are welcome but appointments are preferred.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
