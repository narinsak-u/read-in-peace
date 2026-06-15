import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — Ex Libris" },
      { name: "description", content: "Review the books in your Ex Libris cart." },
      { property: "og:title", content: "Your Cart — Ex Libris" },
      { property: "og:description", content: "Review your selected books before checkout." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, itemCount, removeItem, setQuantity } = useCart();
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="font-serif text-xl font-bold italic text-primary">Ex Libris</Link>
          <Button asChild variant="archivalGhost">
            <Link to="/"><ArrowLeft /> Continue browsing</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:py-14">
        <div className="border-b border-border pb-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">The book bag</p>
          <h1 className="mt-2 font-serif text-4xl font-bold md:text-5xl">Your cart</h1>
          <p className="mt-2 text-sm text-muted-foreground">{itemCount} {itemCount === 1 ? "volume" : "volumes"} selected</p>
        </div>

        {items.length === 0 ? (
          <section className="flex flex-col items-center py-24 text-center">
            <ShoppingCart className="size-10 text-muted-foreground" />
            <h2 className="mt-5 font-serif text-2xl">Your book bag is empty.</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Browse the stacks and keep a permanent copy of something worth returning to.</p>
            <Button asChild variant="archival" className="mt-6"><Link to="/">Explore the library</Link></Button>
          </section>
        ) : (
          <div className="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="divide-y divide-border">
              {items.map((item) => (
                <article key={item.id} className="flex gap-5 py-6 first:pt-0">
                  {item.crop === null ? (
                    <img src={item.cover} alt={`${item.title} book cover`} className="h-36 w-24 shrink-0 object-cover shadow-md" />
                  ) : (
                    <div className={`cover-crop cover-${item.crop} h-36 w-24 shrink-0 shadow-md`}><img src={item.cover} alt={`${item.title} book cover`} /></div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <h2 className="font-serif text-xl font-bold">{item.title}</h2>
                      <p className="mt-1 text-sm italic text-muted-foreground">by {item.author}</p>
                      <p className="mt-3 font-mono text-xs text-primary">${item.price.toFixed(2)}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center border border-border">
                        <Button size="icon" variant="archivalGhost" aria-label={`Decrease ${item.title} quantity`} onClick={() => setQuantity(item.id, item.quantity - 1)}><Minus /></Button>
                        <span className="w-8 text-center font-mono text-xs">{item.quantity}</span>
                        <Button size="icon" variant="archivalGhost" aria-label={`Increase ${item.title} quantity`} onClick={() => setQuantity(item.id, item.quantity + 1)}><Plus /></Button>
                      </div>
                      <Button size="sm" variant="archivalGhost" onClick={() => removeItem(item.id)}><Trash2 /> Remove</Button>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <aside className="h-fit border border-border bg-card p-6 lg:sticky lg:top-8">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Order summary</p>
              <div className="mt-5 flex justify-between border-b border-border pb-5 text-sm"><span>Subtotal</span><strong>${subtotal.toFixed(2)}</strong></div>
              <div className="flex justify-between border-b border-border py-5 text-sm"><span>Shipping</span><span className="text-muted-foreground">Calculated at checkout</span></div>
              <div className="flex items-end justify-between pt-5"><span className="font-serif text-lg">Estimated total</span><strong className="font-serif text-3xl">${subtotal.toFixed(2)}</strong></div>
              <Button className="mt-6 w-full" variant="archival">Proceed to checkout</Button>
              <p className="mt-3 text-center text-[11px] leading-5 text-muted-foreground">Secure checkout will be available when payments are enabled.</p>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}