import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Payment Successful - Ink 37 Tattoos' };

export default function PaymentSuccessPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
      <h1 className="text-2xl font-bold mb-2">Payment Successful</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        Thank you for your payment. You will receive a receipt via email
        shortly. If you have any questions, please contact us.
      </p>
      <Button render={<Link href="/" />}>Return to Home</Button>
    </div>
  );
}
