import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BookOpen,
  Home,
  Library,
  MessageCircle,
  Search,
  Settings,
  ShoppingBag,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartLink } from "@/components/cart-link";
import { useCart } from "@/lib/cart";
import architectureCover from "@/assets/architecture-memory.png";
import coverSheet from "@/assets/book-cover-sheet.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ex Libris — Social Library" },
      {
        name: "description",
        content: "Borrow, return, buy, review, rate, and discuss books with fellow readers.",
      },
      { property: "og:title", content: "Ex Libris — Social Library" },
      {
        property: "og:description",
        content: "A personal library and thoughtful social space for readers.",
      },
    ],
  }),
  component: Index,
});

const arrivals = [
  { id: "the-hidden-sea", title: "The Hidden Sea", author: "Eliot Harbor", crop: 2, rating: 4.7, price: 18.5 },
  { id: "logic-and-form", title: "Logic & Form", author: "Adrian Wakefield", crop: 3, rating: 4.3, price: 24 },
  { id: "paper-shadows", title: "Paper Shadows", author: "Maeve Lincoln", crop: 4, rating: 4.8, price: 16 },
  {
    id: "the-long-night",
    title: "The Long Night",
    author: "Daniel Hastings",
    crop: 5,
    rating: 4.1,
    price: 19.99,
  },
];

function Cover({ crop, className = "" }: { crop: number; className?: string }) {
  return (
    <div className={`cover-crop cover-${crop} ${className}`}>
      <img src={coverSheet} alt="" width={1536} height={1536} loading="lazy" />
    </div>
  );
}

function Index() {
  const { addItem } = useCart();
  const [query, setQuery] = useState("");
  const [returned, setReturned] = useState<string[]>([]);
  const [borrowed, setBorrowed] = useState<string[]>([]);
  const [liked, setLiked] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [notice, setNotice] = useState("");
  const filtered = useMemo(
    () =>
      arrivals.filter((book) =>
        `${book.title} ${book.author}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  };

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground selection:bg-primary/10 selection:text-primary">
      <nav
        aria-label="Primary navigation"
        className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md md:px-6"
      >
        <div className="flex items-center gap-8">
          <button
            onClick={() => scrollTo("loans")}
            className="font-serif text-xl font-bold italic tracking-tight text-primary"
          >
            Ex Libris
          </button>
          <div className="hidden items-center gap-6 text-xs font-medium uppercase tracking-wider text-muted-foreground md:flex">
            <button
              onClick={() => scrollTo("loans")}
              className="border-b border-primary text-foreground"
            >
              Dashboard
            </button>
            <button
              onClick={() => scrollTo("arrivals")}
              className="transition-colors hover:text-foreground"
            >
              Discover
            </button>
            <button
              onClick={() => scrollTo("loans")}
              className="transition-colors hover:text-foreground"
            >
              The Stacks
            </button>
            <button
              onClick={() => scrollTo("feed")}
              className="transition-colors hover:text-foreground"
            >
              Archive
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="relative hidden sm:block">
            <span className="sr-only">Search books</span>
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search titles, authors..."
              className="w-56 rounded-sm border-0 bg-input py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:ring-1 focus:ring-ring lg:w-64"
            />
          </label>
          <CartLink />
          <Button size="icon" variant="archival" aria-label="Open reader profile" className="rounded-full text-xs italic">JS</Button>
        </div>
      </nav>

      <main className="mx-auto grid max-w-7xl grid-cols-12 gap-10 px-4 py-8 md:px-6">
        <div className="col-span-12 space-y-12 lg:col-span-8">
          <section id="loans" className="animate-enter scroll-mt-24">
            <div className="mb-6 flex items-baseline justify-between border-b border-border pb-2">
              <h1 className="font-serif text-2xl">Active Loans</h1>
              <span className="font-mono text-[10px] uppercase text-muted-foreground">
                {3 - returned.length} items currently on desk
              </span>
            </div>

            {!returned.includes("memory") && (
              <article className="group flex flex-col gap-8 rounded-sm border border-border bg-card p-5 md:flex-row md:p-6">
                <div className="shrink-0 self-center shadow-xl transition-transform duration-500 group-hover:-translate-y-1 md:self-auto">
                  <img
                    src={architectureCover}
                    alt="The Architecture of Memory book cover"
                    width={768}
                    height={1152}
                    className="h-[270px] w-[180px] object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between py-2">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-sm bg-primary px-2 py-0.5 font-mono text-[10px] text-primary-foreground">
                        DUE IN 2 DAYS
                      </span>
                      <span className="font-mono text-[10px] uppercase text-muted-foreground">
                        Shelf: 720.1 ARC
                      </span>
                    </div>
                    <h2 className="mb-1 font-serif text-3xl font-bold">
                      <Link
                        to="/book/$bookId"
                        params={{ bookId: "architecture-of-memory" }}
                        className="transition-colors hover:text-primary"
                      >
                        The Architecture of Memory
                      </Link>
                    </h2>
                    <p className="mb-4 italic text-muted-foreground">by Elena Rossi-Vaughn</p>
                    <div className="mb-6 flex items-center gap-1" aria-label="Rated 4.2 out of 5">
                      <span className="text-lg text-primary">★★★★</span>
                      <span className="text-lg text-foreground/10">★</span>
                      <span className="ml-2 text-[11px] font-medium tracking-tight text-muted-foreground">
                        4.2 AVG RATING
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/5">
                      <div className="h-full w-[64%] bg-primary" />
                    </div>
                    <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                      PAGE 218 OF 340 (64%)
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                      variant="archival"
                      onClick={() => {
                        setReturned((items) => [...items, "memory"]);
                        flash("Book returned. Thank you!");
                      }}
                    >
                      Return Book
                    </Button>
                    <Button variant="archivalOutline" onClick={() => setReviewOpen(true)}>
                      Write Review
                    </Button>
                    <Button
                      variant="archivalGhost"
                      onClick={() => {
                        addItem({ id: "architecture-of-memory", title: "The Architecture of Memory", author: "Elena Rossi-Vaughn", price: 21, cover: architectureCover, crop: null });
                        flash("The Architecture of Memory added to your cart.");
                      }}
                    >
                      <ShoppingBag /> Buy $21.00
                    </Button>
                  </div>
                </div>
              </article>
            )}

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                {
                  key: "springs",
                  title: "Silent Springs Revisited",
                  author: "Marissa Langford",
                  crop: 0,
                  due: "DUE: JUN 22",
                },
                {
                  key: "urbanism",
                  title: "Urbanism 2050",
                  author: "Lena Parker",
                  crop: 1,
                  due: "OVERDUE (3D)",
                },
              ]
                .filter((book) => !returned.includes(book.key))
                .map((book) => (
                  <article
                    key={book.key}
                    className="group flex gap-4 rounded-sm border border-border bg-card p-4 transition-colors hover:border-primary/30"
                  >
                    <Cover crop={book.crop} className="h-24 w-16 shrink-0 shadow-sm" />
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <h3 className="font-serif text-sm font-bold leading-tight">{book.title}</h3>
                      <p className="mb-2 text-xs italic text-muted-foreground">{book.author}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-mono text-[10px] ${book.key === "urbanism" ? "font-bold text-primary" : "text-muted-foreground"}`}
                        >
                          {book.due}
                        </span>
                        <Button
                          size="sm"
                          variant="archivalGhost"
                          onClick={() => {
                            setReturned((items) => [...items, book.key]);
                            flash(`${book.title} returned.`);
                          }}
                        >
                          Return
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          </section>

          <section id="arrivals" className="animate-enter scroll-mt-24 [animation-delay:150ms]">
            <div className="mb-6 flex items-baseline justify-between border-b border-border pb-2">
              <h2 className="font-serif text-2xl">New Arrivals</h2>
              <span className="font-mono text-[10px] uppercase text-muted-foreground">
                Curated this week
              </span>
            </div>
            <div className="mb-5 sm:hidden">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search new arrivals..."
                className="w-full rounded-sm bg-input px-4 py-2 text-sm"
              />
            </div>
            {filtered.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4">
                {filtered.map((book) => {
                  const isBorrowed = borrowed.includes(book.title);
                  return (
                    <article key={book.title} className="group">
                      <Link
                        to="/book/$bookId"
                        params={{ bookId: book.id }}
                        aria-label={`View ${book.title}`}
                      >
                        <Cover
                          crop={book.crop}
                          className="mb-3 aspect-[2/3] shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl"
                        />
                      </Link>
                      <h3 className="font-serif text-sm font-bold transition-colors group-hover:text-primary">
                        <Link to="/book/$bookId" params={{ bookId: book.id }}>
                          {book.title}
                        </Link>
                      </h3>
                      <p className="text-xs text-muted-foreground">{book.author}</p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-primary">
                        <Star className="size-3 fill-current" /> {book.rating}
                      </div>
                      <div className="mt-3 flex gap-1">
                        <Button
                          size="sm"
                          variant={isBorrowed ? "archivalOutline" : "archival"}
                          disabled={isBorrowed}
                          onClick={() => {
                            setBorrowed((items) => [...items, book.title]);
                            flash(`${book.title} borrowed for 21 days.`);
                          }}
                        >
                          {isBorrowed ? "Borrowed" : "Borrow"}
                        </Button>
                        <Button
                          size="icon"
                          variant="archivalGhost"
                          aria-label={`Buy ${book.title}`}
                          onClick={() => {
                            addItem({ id: book.id, title: book.title, author: book.author, price: book.price, cover: coverSheet, crop: book.crop });
                            flash(`${book.title} added to your cart.`);
                          }}
                        >
                          <ShoppingBag />
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="border-y border-border py-12 text-center font-serif italic text-muted-foreground">
                No volumes match “{query}”. Try another title or author.
              </p>
            )}
          </section>
        </div>

        <aside className="col-span-12 space-y-10 lg:col-span-4">
          <section className="animate-enter relative overflow-hidden border border-border bg-card p-6 shadow-sm [animation-delay:250ms]">
            <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
            <h2 className="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Yearly Progress
            </h2>
            <div className="mb-1 flex items-baseline gap-2">
              <span className="font-serif text-4xl font-bold">24</span>
              <span className="text-sm italic text-muted-foreground">of 50 books</span>
            </div>
            <div className="mb-4 h-1 w-full bg-foreground/5">
              <div className="h-full w-[48%] bg-foreground" />
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              You are <span className="text-primary">2 books behind</span> your 2026 reading goal. A
              short essay collection might be perfect this weekend.
            </p>
          </section>

          <section id="feed" className="animate-enter scroll-mt-24 [animation-delay:300ms]">
            <div className="mb-4 flex items-baseline justify-between border-b border-border pb-2">
              <h2 className="font-serif text-xl">Reader Feed</h2>
              <span className="size-2 rounded-full bg-primary" />
            </div>
            <div className="space-y-6">
              <article className="border-l border-foreground/5 pl-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold">
                    AM
                  </span>
                  <span className="text-[11px] font-bold uppercase">Aris M.</span>
                  <span className="font-mono text-[10px] text-muted-foreground">14m ago</span>
                </div>
                <p className="text-sm leading-snug text-foreground/80">
                  “Rossi-Vaughn's chapter on brutalist memorials is devastating. Did anyone else
                  catch the reference to Rossi's own cemetery design?”
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <Button
                    variant="archivalGhost"
                    size="sm"
                    onClick={() => flash("Reply composer opened.")}
                  >
                    <MessageCircle /> Reply
                  </Button>
                  <Button
                    variant="archivalGhost"
                    size="sm"
                    onClick={() => setLiked((value) => !value)}
                    className={liked ? "text-primary" : ""}
                  >
                    {liked ? "Liked" : "Like"} ({liked ? 13 : 12})
                  </Button>
                </div>
              </article>
              <article className="border-l border-foreground/5 pl-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold">
                    LW
                  </span>
                  <span className="text-[11px] font-bold uppercase">Leo Wang</span>
                  <span className="font-mono text-[10px] text-muted-foreground">2h ago</span>
                </div>
                <p className="text-sm leading-snug text-foreground/80">
                  Just finished{" "}
                  <span className="italic underline decoration-primary/30 underline-offset-2">
                    Paper Shadows
                  </span>
                  . A little quiet in the middle, but the ending is worth it.
                </p>
                <p className="mt-2 text-xs text-primary" aria-label="3 out of 5 stars">
                  ★★★<span className="text-foreground/10">★★</span>
                </p>
              </article>
              <article className="border-l border-foreground/5 pl-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold">
                    SS
                  </span>
                  <span className="text-[11px] font-bold uppercase">Sarah S.</span>
                  <span className="font-mono text-[10px] text-muted-foreground">Yesterday</span>
                </div>
                <p className="text-sm leading-snug text-foreground/80">
                  Looking for recommendations on mid-century urban design. Any classics I’m missing?
                </p>
                <Button
                  className="mt-2"
                  variant="archivalGhost"
                  size="sm"
                  onClick={() => flash("Discussion saved to your archive.")}
                >
                  View discussion
                </Button>
              </article>
            </div>
          </section>

          <section className="animate-enter rounded-sm border-2 border-dashed border-border p-6 text-center [animation-delay:350ms]">
            <p className="mb-4 font-serif text-sm italic">
              Join the literary circles in your neighborhood.
            </p>
            <Button
              className="w-full uppercase tracking-widest"
              variant="archivalOutline"
              onClick={() => flash("We found 8 active clubs near you.")}
            >
              Find a Book Club
            </Button>
          </section>
        </aside>
      </main>

      <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-8 rounded-full border border-background/10 bg-foreground px-8 py-3 text-background shadow-2xl">
        <Button variant="archivalDock" onClick={() => scrollTo("loans")}>
          <Home />
          <span className="font-mono text-[8px] uppercase opacity-60">Home</span>
        </Button>
        <Button variant="archivalDock" onClick={() => scrollTo("arrivals")}>
          <Library />
          <span className="font-mono text-[8px] uppercase opacity-60">Shelf</span>
        </Button>
        <Button variant="archivalDock" onClick={() => scrollTo("feed")}>
          <MessageCircle />
          <span className="font-mono text-[8px] uppercase opacity-60">Social</span>
        </Button>
        <Button variant="archivalDock" onClick={() => flash("Reading preferences are up to date.")}>
          <Settings />
          <span className="font-mono text-[8px] uppercase opacity-60">Prefs</span>
        </Button>
      </div>

      {reviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-title"
          onMouseDown={() => setReviewOpen(false)}
        >
          <div
            className="w-full max-w-lg border border-border bg-background p-6 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex gap-4">
              <img
                src={architectureCover}
                alt=""
                width={768}
                height={1152}
                className="h-24 w-16 object-cover shadow"
              />
              <div>
                <p className="font-mono text-[10px] uppercase text-primary">Reader review</p>
                <h2 id="review-title" className="font-serif text-2xl font-bold">
                  The Architecture of Memory
                </h2>
                <p className="text-sm text-muted-foreground">What stayed with you?</p>
              </div>
            </div>
            <div className="mb-4 flex gap-1" aria-label={`Your rating: ${rating} out of 5`}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  aria-label={`Rate ${value} stars`}
                  onClick={() => setRating(value)}
                >
                  <Star
                    className={`size-7 ${value <= rating ? "fill-current text-primary" : "text-border"}`}
                  />
                </button>
              ))}
            </div>
            <label className="text-sm font-medium" htmlFor="review">
              Your review
            </label>
            <textarea
              id="review"
              value={review}
              onChange={(event) => setReview(event.target.value)}
              rows={5}
              placeholder="Write from the margins..."
              className="mt-2 w-full resize-none rounded-sm border border-border bg-card p-3 text-sm focus:ring-1 focus:ring-ring"
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="archivalGhost" onClick={() => setReviewOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="archival"
                disabled={!rating || !review.trim()}
                onClick={() => {
                  setReviewOpen(false);
                  setReview("");
                  flash("Your review was published to the reader feed.");
                }}
              >
                Publish Review
              </Button>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="fixed right-5 top-20 z-50 border border-border bg-foreground px-4 py-3 text-sm text-background shadow-xl"
        >
          {notice}
        </div>
      )}
    </div>
  );
}
