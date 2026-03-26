'use client';

import Cal, { getCalApi } from '@calcom/embed-react';
import { useEffect } from 'react';

interface CalEmbedProps {
  calLink: string;
}

export function CalEmbed({ calLink }: CalEmbedProps) {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi();
      cal('preload', { calLink });
      cal('ui', {
        theme: 'light',
        styles: { branding: { brandColor: '#e8432b' } },
        hideEventTypeDetails: false,
      });
      cal('on', {
        action: 'bookingSuccessful',
        callback: () => {
          // Dynamic import to avoid bundling sonner in cal-embed chunk
          import('sonner').then(({ toast }) => {
            toast.success('Booking confirmed! Check your email for details.');
          });
        },
      });
    })();
  }, [calLink]);

  return (
    <Cal
      calLink={calLink}
      style={{ width: '100%', height: '100%', overflow: 'auto' }}
      config={{ layout: 'month_view' }}
    />
  );
}
