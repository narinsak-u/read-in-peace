import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";

export function CartLink() {
  const { itemCount } = useCart();

  return (
    <Button
      asChild
      size="icon"
      variant="archivalGhost"
      className="relative"
      aria-label="Open cart"
    >
      <Link to="/cart">
        <ShoppingCart />
        {itemCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary font-mono text-[9px] text-primary-foreground">
            {itemCount}
          </span>
        )}
      </Link>
    </Button>
  );
}
