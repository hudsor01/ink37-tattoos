import { connection } from 'next/server';
import { getGiftCards } from '@/lib/dal/gift-cards';
import { GiftCardsClient } from './gift-cards-client';

export default async function GiftCardsPage() {
  await connection();
  const result = await getGiftCards();

  const serialized = {
    ...result,
    data: result.data.map((card) => ({
      ...card,
      createdAt: card.createdAt.toISOString(),
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Gift Cards</h1>
        <p className="text-muted-foreground">
          Issue and manage gift cards.
        </p>
      </div>
      <GiftCardsClient initialData={serialized} />
    </div>
  );
}
