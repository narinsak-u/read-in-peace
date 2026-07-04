import { describe, it, expect } from "vitest";
import { mergeGuestCart, type CartItem } from "~/stores/cart";

function item(id: string, quantity = 1): CartItem {
  return {
    id,
    title: `Book ${id}`,
    author: "Author",
    price: 10,
    cover: "cover.jpg",
    crop: null,
    quantity,
    stock: 5,
    category: "fiction",
  };
}

describe("mergeGuestCart", () => {
  it("returns existing cart unchanged when guest cart is empty", () => {
    const existing = [item("a"), item("b")];
    expect(mergeGuestCart(existing, [])).toEqual(existing);
  });

  it("appends guest items that do not exist in cart", () => {
    const existing = [item("a")];
    const guest = [item("b")];
    const result = mergeGuestCart(existing, guest);
    expect(result).toHaveLength(2);
    expect(result.find((i) => i.id === "a")).toBeTruthy();
    expect(result.find((i) => i.id === "b")).toBeTruthy();
  });

  it("takes max quantity when item exists in both", () => {
    const existing = [item("a", 2)];
    const guest = [item("a", 5)];
    const result = mergeGuestCart(existing, guest);
    expect(result.find((i) => i.id === "a")!.quantity).toBe(5);
  });

  it("takes existing quantity when it is larger than guest", () => {
    const existing = [item("a", 5)];
    const guest = [item("a", 2)];
    const result = mergeGuestCart(existing, guest);
    expect(result.find((i) => i.id === "a")!.quantity).toBe(5);
  });

  it("merges overlapping and non-overlapping items", () => {
    const existing = [item("a", 1), item("b", 2)];
    const guest = [item("b", 3), item("c", 1)];
    const result = mergeGuestCart(existing, guest);
    expect(result).toHaveLength(3);
    expect(result.find((i) => i.id === "a")!.quantity).toBe(1);
    expect(result.find((i) => i.id === "b")!.quantity).toBe(3);
    expect(result.find((i) => i.id === "c")!.quantity).toBe(1);
  });

  it("returns empty when both are empty", () => {
    expect(mergeGuestCart([], [])).toEqual([]);
  });
});
