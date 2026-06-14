## Discount Strategy

The engine supports one discount from each of three categories, applied in a fixed sequence. Only one campaign per category can be active at a time.

### Pipeline

```
Subtotal  →  Coupon  →  On Top  →  Seasonal  →  Final Price
```

Each step receives the total from the previous step. The final price is never allowed to go below zero.

### 1. Coupon (applied first)

Reduces the subtotal by a fixed amount or a percentage.

| Type | Formula | Example |
|------|---------|---------|
| **Fixed Amount** | `total - min(amount, total)` | 50 THB coupon on 200 THB cart → 150 THB |
| **Percentage** | `total - (total × percentage / 100)` | 10% coupon on 200 THB cart → 180 THB |

A fixed-amount coupon cannot reduce the total below zero — the discount is capped at the current total.

### 2. On Top (applied second)

Applied to the total *after* the coupon step. Needs access to the original cart items (for category-based discounts).

| Type | Formula | Constraint |
|------|---------|------------|
| **Category Percentage** | `total - (categorySubtotal × percentage / 100)` | Discount based on original item prices in the target category |
| **Points** | `total - min(points, total × 0.2)` | 1 point = 1 THB. Capped at 20% of current total |

**Category Percentage example:**

| Item | Category | Price | Qty | Subtotal |
|------|----------|-------|-----|----------|
| Shirt | Clothing | 200 | 2 | 400 |
| Laptop | Electronics | 1000 | 1 | 1000 |
| Apple | Food | 10 | 5 | 50 |

10% Off Clothing campaign → discount = 400 × 0.10 = **40 THB** off the current total.

**Points example:**

- Current total: 500 THB, you have 200 points
- Max allowed: 500 × 0.20 = 100 points
- Effective discount: min(200, 100) = **100 THB**

### 3. Seasonal (applied third)

A tiered discount: for every X THB in the remaining total, subtract Y THB.

| Type | Formula | Example |
|------|---------|---------|
| **Every X, discount Y** | `floor(total / everyX) × discountY` | Every 100 THB → 10 THB off. Total 250 → floor(250/100) × 10 = **20 THB** |

If the total is less than `everyX`, no discount is applied.

### Worked Example

Cart:

| Item | Category | Price | Qty | Subtotal |
|------|----------|-------|-----|----------|
| Shirt | Clothing | 200 | 2 | 400 |
| Laptop | Electronics | 1000 | 1 | 1000 |
| Apple | Food | 10 | 5 | 50 |

**Discounts applied:**
- **Coupon:** Fixed 150 THB off
- **On Top:** 10% off Electronics category
- **Seasonal:** Every 100 THB → 20 THB off

| Step | Total In | Discount | Total Out |
|------|----------|----------|-----------|
| Subtotal | — | — | **1450.00** |
| Coupon (fixed 150) | 1450.00 | -150.00 | **1300.00** |
| On Top (10% Electronics = 1000 × 0.10) | 1300.00 | -100.00 | **1200.00** |
| Seasonal (floor(1200/100) × 20) | 1200.00 | -240.00 | **960.00** |
| **Final Price** | | | **960.00 THB** |


## Assumptions

- Only one discount per category can be active at a time
- Category percentage discount is calculated on original item prices (not post-coupon total)
- Point discount cap (20%) is applied against the total after the coupon step
- Seasonal discount floors the division (every X THB), no fractional discounts
- Empty/invalid form inputs default to 0 for pipeline computation
