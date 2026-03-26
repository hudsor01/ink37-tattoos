'use client';

import { useState, useTransition } from 'react';
import { signConsentAction } from '@/lib/actions/portal-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const CONSENT_SECTIONS = [
  {
    title: 'HEALTH DECLARATION',
    text: 'I am not under the influence of alcohol or drugs. I do not have diabetes, epilepsy, hemophilia, or heart conditions that may affect the procedure. I am not pregnant or nursing.',
  },
  {
    title: 'ALLERGIES',
    text: 'I have disclosed any known allergies to inks, dyes, latex, or other materials that may be used.',
  },
  {
    title: 'RISKS',
    text: 'I understand that tattooing involves the risk of infection, allergic reaction, scarring, and unsatisfactory results. I accept these risks.',
  },
  {
    title: 'AFTERCARE',
    text: 'I agree to follow all aftercare instructions provided by the artist. I understand that failure to follow aftercare may result in damage to the tattoo or infection.',
  },
  {
    title: 'AGE VERIFICATION',
    text: 'I confirm that I am at least 18 years of age.',
  },
  {
    title: 'RELEASE OF LIABILITY',
    text: 'I release Ink 37 Tattoos and its artists from any liability arising from the tattoo procedure.',
  },
  {
    title: 'FINAL DESIGN',
    text: 'I have reviewed and approved the final design, placement, and size of the tattoo.',
  },
];

export function ConsentForm({ sessionId }: { sessionId: string }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [signedName, setSignedName] = useState('');
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!acknowledged) {
      toast.error('You must acknowledge the consent terms.');
      return;
    }
    if (!signedName.trim()) {
      toast.error('Please type your full legal name as a digital signature.');
      return;
    }

    startTransition(() => {
      const formData = new FormData();
      formData.set('sessionId', sessionId);
      formData.set('signedName', signedName.trim());
      formData.set('acknowledged', 'true');

      toast.promise(
        signConsentAction(formData).then((result) => {
          if (!result.success) throw new Error(result.error ?? 'Failed to sign consent form.');
          return result;
        }),
        {
          loading: 'Signing consent form...',
          success: 'Consent form signed successfully',
          error: (err) => err.message || 'Failed to sign consent form.',
        }
      );
    });
  }

  return (
    <div className="rounded-lg border bg-white p-4 md:p-6">
      <h3 className="mb-4 text-lg font-semibold">
        Tattoo Consent and Release Form
      </h3>

      <div className="mb-6 space-y-4 text-sm">
        <p className="text-muted-foreground">
          By signing this form, I acknowledge and agree to the following:
        </p>

        <ol className="list-inside space-y-3">
          {CONSENT_SECTIONS.map((section, index) => (
            <li key={section.title}>
              <span className="font-semibold">
                {index + 1}. {section.title}:
              </span>{' '}
              {section.text}
            </li>
          ))}
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id={`consent-ack-${sessionId}`}
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-1 size-4 rounded border-gray-300"
          />
          <Label htmlFor={`consent-ack-${sessionId}`} className="text-sm leading-normal">
            I have read, understood, and agree to all terms above
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`consent-name-${sessionId}`}>
            Type your full legal name as digital signature
          </Label>
          <Input
            id={`consent-name-${sessionId}`}
            type="text"
            value={signedName}
            onChange={(e) => setSignedName(e.target.value)}
            placeholder="Your full legal name"
            required
          />
        </div>

        <Button type="submit" disabled={isPending || !acknowledged || !signedName.trim()}>
          {isPending ? 'Signing...' : 'Sign Consent Form'}
        </Button>
      </form>
    </div>
  );
}
