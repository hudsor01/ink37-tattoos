'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReceiptDownloadButtonProps {
  paymentId: string;
  disabled?: boolean;
}

export function ReceiptDownloadButton({ paymentId, disabled }: ReceiptDownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const response = await fetch(`/api/receipts/${paymentId}`);

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data?.error ?? 'Failed to generate receipt. Please try again.';
        toast.error(message);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `receipt-${paymentId.slice(0, 8)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to generate receipt. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDownload}
      disabled={disabled || loading}
      aria-label="Download receipt"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-1" />
      )}
      {loading ? '' : 'Receipt'}
    </Button>
  );
}
