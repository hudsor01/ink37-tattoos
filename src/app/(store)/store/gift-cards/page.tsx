import { GiftCardForm } from '@/components/store/gift-card-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gift Cards | Ink 37 Tattoos',
  description: 'Send a gift card to someone special. Gift cards never expire.',
};

export default function GiftCardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold">Send a Gift Card</h1>
      </div>
      <GiftCardForm />
    </div>
  );
}
