import { applyDiscounts } from './transactions.service';

describe('applyDiscounts', () => {
  it('applies 0% tier for 1 item', () => {
    const result = applyDiscounts([{ price: '25.00', category: 'Fiction' }]);
    expect(result).toEqual({
      subtotal: 2500,
      tierPercent: 0,
      tierDiscount: 0,
      categoryBonus: 0,
      every100Discount: 0,
      total: 2500,
    });
  });

  it('applies 10% tier for 2 items, no category bonus if different categories', () => {
    const result = applyDiscounts([
      { price: '20.00', category: 'Fiction' },
      { price: '30.00', category: 'Science' },
    ]);
    expect(result).toEqual({
      subtotal: 5000,
      tierPercent: 10,
      tierDiscount: 500,
      categoryBonus: 0,
      every100Discount: 0,
      total: 4500,
    });
  });

  it('applies 20% tier for 3 items with category bonus', () => {
    const result = applyDiscounts([
      { price: '10.00', category: 'Fiction' },
      { price: '15.00', category: 'Fiction' },
      { price: '20.00', category: 'Science' },
    ]);
    expect(result).toEqual({
      subtotal: 4500,
      tierPercent: 20,
      tierDiscount: 900,
      categoryBonus: 250,
      every100Discount: 0,
      total: 3350,
    });
  });

  it('applies 30% tier for 4 items with per-category bonus', () => {
    const result = applyDiscounts([
      { price: '10.00', category: 'Fiction' },
      { price: '15.00', category: 'Fiction' },
      { price: '20.00', category: 'Science' },
      { price: '25.00', category: 'Science' },
    ]);
    expect(result).toEqual({
      subtotal: 7000,
      tierPercent: 30,
      tierDiscount: 2100,
      categoryBonus: 700,
      every100Discount: 0,
      total: 4200,
    });
  });

  it('applies every-$100 discount above $100 threshold', () => {
    const result = applyDiscounts([
      { price: '70.00', category: 'Fiction' },
      { price: '80.00', category: 'Fiction' },
      { price: '90.00', category: 'Science' },
    ]);
    expect(result).toEqual({
      subtotal: 24000,
      tierPercent: 20,
      tierDiscount: 4800,
      categoryBonus: 1500,
      every100Discount: 100,
      total: 17600,
    });
  });

  it('never goes below zero', () => {
    const result = applyDiscounts([{ price: '0.50', category: 'Fiction' }]);
    expect(result.total).toBeGreaterThanOrEqual(0);
  });
});
