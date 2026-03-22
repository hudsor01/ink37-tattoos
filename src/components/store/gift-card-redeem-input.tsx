'use client';

import { useState, useTransition } from 'react';
import { validateGiftCardAction } from '@/lib/actions/gift-card-actions';
import { formatCurrency } from '@/lib/store-helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface GiftCardRedeemInputProps {
  onValidCode: (code: string, balance: number) => void;
  onClear: () => void;
}

export function GiftCardRedeemInput({ onValidCode, onClear }: GiftCardRedeemInputProps) {
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState(false);
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleApply = () => {
    if (!code.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await validateGiftCardAction(code.trim());
      if (result.valid && result.balance != null) {
        setApplied(true);
        setBalance(result.balance);
        onValidCode(code.trim(), result.balance);
      } else {
        setError('Invalid gift card code. Please check and try again.');
      }
    });
  };

  const handleRemove = () => {
    setCode('');
    setApplied(false);
    setBalance(0);
    setError(null);
    onClear();
  };

  if (applied) {
    return (
      <div className="flex w-full items-center justify-between text-sm">
        <span className="text-green-600">Gift card balance: {formatCurrency(balance)}</span>
        <Button variant="ghost" size="xs" className="text-destructive" onClick={handleRemove}>
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-1">
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="INK37-XXXX-XXXX-XXXX"
          className="flex-1"
        />
        <Button variant="outline" size="default" onClick={handleApply} disabled={isPending}>
          {isPending ? '...' : 'Apply'}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
