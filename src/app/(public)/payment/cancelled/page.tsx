import { XCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Payment Cancelled - Ink 37 Tattoos' };

export default function PaymentCancelledPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <XCircle className="h-16 w-16 text-red-500 mb-4" />
      <h1 className="text-2xl font-bold mb-2">Payment Cancelled</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        Your payment was cancelled. No charges were made. If you need to
        complete your payment, please use the payment link sent to your
        email or contact us.
      </p>
      <Button render={<Link href="/" />}>Return to Home</Button>
    </div>
  );
}
