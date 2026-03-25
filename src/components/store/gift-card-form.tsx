'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { purchaseGiftCardAction } from '@/lib/actions/gift-card-actions';
import { GIFT_CARD_DENOMINATIONS, formatCurrency } from '@/lib/store-helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  denomination: z.string().min(1, 'Please select an amount'),
  recipientName: z.string().min(1, 'Recipient name is required'),
  recipientEmail: z.string().email('Invalid email address'),
  senderName: z.string().min(1, 'Your name is required'),
  personalMessage: z.string().max(500).optional(),
});

type FormData = z.infer<typeof formSchema>;

export function GiftCardForm() {
  const [selectedDenomination, setSelectedDenomination] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { denomination: '', recipientName: '', recipientEmail: '', senderName: '', personalMessage: '' },
  });

  const onSubmit = (data: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await purchaseGiftCardAction(data);
        if (result.success && result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
        } else {
          setError("Couldn't start checkout. Please try again.");
        }
      } catch {
        setError("Couldn't start checkout. Please try again.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-xl space-y-6">
      {/* Denomination selection */}
      <div className="space-y-2">
        <span className="flex items-center gap-2 text-sm leading-none font-medium">Select Amount</span>
        <div className="flex flex-wrap gap-3">
          {GIFT_CARD_DENOMINATIONS.map((amount) => (
            <Button
              key={amount}
              type="button"
              variant={selectedDenomination === amount ? 'default' : 'secondary'}
              className={cn(
                'min-h-[48px] min-w-[72px] text-base font-semibold',
                selectedDenomination === amount && 'bg-primary text-primary-foreground'
              )}
              onClick={() => {
                setSelectedDenomination(amount);
                setValue('denomination', String(amount), { shouldValidate: true });
              }}
            >
              {formatCurrency(amount)}
            </Button>
          ))}
        </div>
        {errors.denomination && (
          <p className="text-sm text-destructive">{errors.denomination.message}</p>
        )}
      </div>

      {/* Recipient Name */}
      <div className="space-y-2">
        <Label htmlFor="recipientName">Recipient Name</Label>
        <Input id="recipientName" {...register('recipientName')} />
        {errors.recipientName && (
          <p className="text-sm text-destructive">{errors.recipientName.message}</p>
        )}
      </div>

      {/* Recipient Email */}
      <div className="space-y-2">
        <Label htmlFor="recipientEmail">Recipient Email</Label>
        <Input id="recipientEmail" type="email" {...register('recipientEmail')} />
        {errors.recipientEmail && (
          <p className="text-sm text-destructive">{errors.recipientEmail.message}</p>
        )}
      </div>

      {/* Sender Name */}
      <div className="space-y-2">
        <Label htmlFor="senderName">Your Name</Label>
        <Input id="senderName" {...register('senderName')} />
        {errors.senderName && (
          <p className="text-sm text-destructive">{errors.senderName.message}</p>
        )}
      </div>

      {/* Personal Message */}
      <div className="space-y-2">
        <Label htmlFor="personalMessage">Personal Message (optional)</Label>
        <Textarea id="personalMessage" {...register('personalMessage')} maxLength={500} />
      </div>

      <p className="text-sm text-muted-foreground">Gift cards never expire.</p>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      <Button
        type="submit"
        size="lg"
        className="w-full bg-brand-accent hover:bg-brand-accent/90 text-white"
        disabled={isPending}
      >
        {isPending ? 'Processing...' : 'Send Gift Card'}
      </Button>
    </form>
  );
}
