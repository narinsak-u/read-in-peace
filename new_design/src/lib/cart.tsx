import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  id: string;
  title: string;
  author: string;
  price: number;
  cover: string;
  crop: number | null;
  quantity: number;
};

type AddCartItem = Omit<CartItem, "quantity">;

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  addItem: (item: AddCartItem) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      addItem: (newItem) =>
        setItems((current) => {
          const existing = current.find((item) => item.id === newItem.id);
          return existing
            ? current.map((item) =>
                item.id === newItem.id ? { ...item, quantity: item.quantity + 1 } : item,
              )
            : [...current, { ...newItem, quantity: 1 }];
        }),
      removeItem: (id) => setItems((current) => current.filter((item) => item.id !== id)),
      setQuantity: (id, quantity) =>
        setItems((current) =>
          quantity < 1
            ? current.filter((item) => item.id !== id)
            : current.map((item) => (item.id === id ? { ...item, quantity } : item)),
        ),
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}