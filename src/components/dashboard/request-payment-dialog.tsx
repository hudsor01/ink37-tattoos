'use client';

import { useState, useTransition } from 'react';
import { requestDepositAction, requestBalanceAction } from '@/lib/actions/payment-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CreditCard } from 'lucide-react';

// Session type for the select dropdown
type SessionOption = {
  id: string;
  designDescription: string;
  totalCost: { toString(): string };
  paidAmount: { toString(): string };
  depositAmount: { toString(): string };
  customer: { firstName: string; lastName: string; email: string | null };
};

interface RequestPaymentDialogProps {
  sessions: SessionOption[];
}

export function RequestPaymentDialog({ sessions }: RequestPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [paymentType, setPaymentType] = useState<'deposit' | 'balance'>('deposit');
  const [depositAmount, setDepositAmount] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const remainingBalance = selectedSession
    ? Number(selectedSession.totalCost.toString()) - Number(selectedSession.paidAmount.toString())
    : 0;

  function handleSubmit() {
    if (!selectedSessionId) return;
    setError(null);

    const formData = new FormData();
    formData.set('sessionId', selectedSessionId);

    if (paymentType === 'deposit') {
      const amount = Number(depositAmount);
      if (!amount || amount <= 0) {
        setError('Enter a valid deposit amount');
        return;
      }
      formData.set('amount', String(amount));
    }

    startTransition(async () => {
      try {
        const action = paymentType === 'deposit' ? requestDepositAction : requestBalanceAction;
        const result = await action(formData);
        if (result.success) {
          setOpen(false);
          setSelectedSessionId('');
          setDepositAmount('');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create payment request');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button>
          <CreditCard className="h-4 w-4 mr-2" />
          Request Payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Payment</DialogTitle>
          <DialogDescription>
            Select a tattoo session and payment type. The client will receive a payment link via email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Tattoo Session
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
              >
                <option value="">Select a session...</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.customer.firstName} {s.customer.lastName} - {s.designDescription}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <span className="text-sm font-medium">Payment Type</span>
            <div className="mt-1 flex gap-2">
              <Button
                variant={paymentType === 'deposit' ? 'default' : 'outline'}
                size="sm"
                type="button"
                onClick={() => setPaymentType('deposit')}
              >
                Deposit
              </Button>
              <Button
                variant={paymentType === 'balance' ? 'default' : 'outline'}
                size="sm"
                type="button"
                onClick={() => setPaymentType('balance')}
              >
                Session Balance
              </Button>
            </div>
          </div>

          {paymentType === 'deposit' && (
            <div>
              <label className="text-sm font-medium">Deposit Amount ($)
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 50.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="mt-1"
                />
              </label>
            </div>
          )}

          {paymentType === 'balance' && selectedSession && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p>Total Cost: <strong>${Number(selectedSession.totalCost.toString()).toFixed(2)}</strong></p>
              <p>Already Paid: <strong>${Number(selectedSession.paidAmount.toString()).toFixed(2)}</strong></p>
              <p>Remaining: <strong>${remainingBalance.toFixed(2)}</strong></p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !selectedSessionId}>
            {isPending ? 'Sending...' : 'Send Payment Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
