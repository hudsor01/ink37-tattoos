'use client';

import { useActionState, useEffect, useRef } from 'react';
import { submitContactForm } from '@/lib/actions/contact-actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { track } from '@vercel/analytics';

type ActionState = {
  success: boolean;
  error?: string;
  errors?: Record<string, string[]>;
} | null;

async function contactAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return submitContactForm(formData);
}

export function ContactForm() {
  const [state, action, pending] = useActionState(contactAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;

    if (state.success) {
      // Conversion event for Vercel Analytics. Booking page-views and
      // gallery interactions are auto-tracked via @vercel/analytics
      // page-view instrumentation; this explicit event captures the
      // contact-form-submit conversion which is the primary inbound
      // funnel for non-booking inquiries.
      track('contact_form_submitted');
      toast.success("Message sent! We'll get back to you within 24 hours.");
      formRef.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="Your full name"
          aria-invalid={!!state?.errors?.name}
        />
        {state?.errors?.name && (
          <p className="text-sm text-destructive">{state.errors.name[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="your@email.com"
          aria-invalid={!!state?.errors?.email}
        />
        {state?.errors?.email && (
          <p className="text-sm text-destructive">{state.errors.email[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="(555) 123-4567"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder="Tell us about your tattoo idea or any questions you have..."
          aria-invalid={!!state?.errors?.message}
        />
        {state?.errors?.message && (
          <p className="text-sm text-destructive">
            {state.errors.message[0]}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-[oklch(0.637_0.237_25.331)] text-white hover:bg-[oklch(0.577_0.237_25.331)]"
        size="lg"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Sending...
          </>
        ) : (
          'Send Message'
        )}
      </Button>
    </form>
  );
}
