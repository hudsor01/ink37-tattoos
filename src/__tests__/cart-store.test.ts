import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore, type CartItem } from '@/stores/cart-store';

const mockItem: CartItem = {
  productId: 'prod-1',
  name: 'Test T-Shirt',
  price: 29.99,
  quantity: 1,
  imageUrl: '/test.jpg',
  productType: 'PHYSICAL',
};

const mockDigitalItem: CartItem = {
  productId: 'prod-2',
  name: 'Art Print',
  price: 15.00,
  quantity: 1,
  imageUrl: '/print.jpg',
  productType: 'DIGITAL',
};

const mockGiftCard: CartItem = {
  productId: 'prod-3',
  name: 'Gift Card $50',
  price: 50,
  quantity: 1,
  imageUrl: '/gift.jpg',
  productType: 'GIFT_CARD',
  giftCardDenomination: 50,
  recipientName: 'Jane',
  recipientEmail: 'jane@test.com',
  senderName: 'John',
};

describe('cart store', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it('starts with empty cart', () => {
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().totalItems()).toBe(0);
    expect(useCartStore.getState().totalPrice()).toBe(0);
  });

  it('adds item to cart', () => {
    useCartStore.getState().addItem(mockItem);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].productId).toBe('prod-1');
  });

  it('increments quantity for duplicate product', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().addItem({ ...mockItem, quantity: 2 });
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it('always adds gift cards as separate items', () => {
    useCartStore.getState().addItem(mockGiftCard);
    useCartStore.getState().addItem({ ...mockGiftCard, recipientName: 'Alice' });
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('removes item from cart', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().removeItem('prod-1');
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('updates item quantity', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().updateQuantity('prod-1', 5);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it('removes item when quantity set to 0', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().updateQuantity('prod-1', 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('clears all items', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().addItem(mockDigitalItem);
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('calculates total items across quantities', () => {
    useCartStore.getState().addItem({ ...mockItem, quantity: 3 });
    useCartStore.getState().addItem(mockDigitalItem);
    expect(useCartStore.getState().totalItems()).toBe(4);
  });

  it('calculates total price', () => {
    useCartStore.getState().addItem({ ...mockItem, quantity: 2 });
    // 29.99 * 2 = 59.98
    expect(useCartStore.getState().totalPrice()).toBeCloseTo(59.98);
  });

  it('detects physical items in cart', () => {
    useCartStore.getState().addItem(mockDigitalItem);
    expect(useCartStore.getState().hasPhysicalItems()).toBe(false);
    useCartStore.getState().addItem(mockItem);
    expect(useCartStore.getState().hasPhysicalItems()).toBe(true);
  });
});
