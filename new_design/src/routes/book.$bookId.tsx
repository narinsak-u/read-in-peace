import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock3,
  Heart,
  MessageCircle,
  ShoppingBag,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartLink } from "@/components/cart-link";
import { useCart } from "@/lib/cart";
import architectureCover from "@/assets/architecture-memory.png";
import coverSheet from "@/assets/book-cover-sheet.png";

const books = {
  "architecture-of-memory": {
    title: "The Architecture of Memory",
    author: "Elena Rossi-Vaughn",
    cover: architectureCover,
    crop: null,
    rating: 4.2,
    ratings: 384,
    price: "$21.00",
    available: 3,
    shelf: "720.1 ARC",
    pages: 340,
    year: 2026,
    description:
      "A luminous inquiry into the buildings we remember and the rooms we cannot forget. Moving between memorials, family homes, and imagined cities, Rossi-Vaughn asks how architecture becomes an archive of private and collective life.",
  },
  "the-hidden-sea": {
    title: "The Hidden Sea",
    author: "Eliot Harbor",
    cover: coverSheet,
    crop: 2,
    rating: 4.7,
    ratings: 612,
    price: "$18.50",
    available: 5,
    shelf: "551.46 HAR",
    pages: 288,
    year: 2026,
    description:
      "A journey beneath the surface of the world's oceans, blending natural history, human curiosity, and the strange beauty of the deep into an unforgettable work of narrative nonfiction.",
  },
  "logic-and-form": {
    title: "Logic & Form",
    author: "Adrian Wakefield",
    cover: coverSheet,
    crop: 3,
    rating: 4.3,
    ratings: 271,
    price: "$24.00",
    available: 1,
    shelf: "160 WAK",
    pages: 312,
    year: 2025,
    description:
      "Selected essays on reason, beauty, and the hidden structures that shape how we think. Precise without being austere, Wakefield makes philosophy feel wonderfully close at hand.",
  },
  "paper-shadows": {
    title: "Paper Shadows",
    author: "Maeve Lincoln",
    cover: coverSheet,
    crop: 4,
    rating: 4.8,
    ratings: 908,
    price: "$16.00",
    available: 0,
    shelf: "FIC LIN",
    pages: 224,
    year: 2026,
    description:
      "Seven short fictions about the stories we tell, the selves we leave behind, and the quiet thresholds between memory and invention.",
  },
  "the-long-night": {
    title: "The Long Night",
    author: "Daniel Hastings",
    cover: coverSheet,
    crop: 5,
    rating: 4.1,
    ratings: 447,
    price: "$19.99",
    available: 2,
    shelf: "FIC HAS",
    pages: 368,
    year: 2025,
    description:
      "When the world holds its breath, a remote household must decide what they owe one another. An atmospheric novel of isolation, loyalty, and the first light after darkness.",
  },
} as const;

type BookId = keyof typeof books;

const initialReviews = [
  {
    id: 1,
    initials: "AM",
    name: "Aris M.",
    time: "14m ago",
    rating: 5,
    text: "The chapter on brutalist memorials is devastating. I kept returning to its idea that a building can remember on our behalf.",
    likes: 12,
    replies: ["That was the passage that stayed with me too. — Mina K."],
  },
  {
    id: 2,
    initials: "LW",
    name: "Leo Wang",
    time: "2h ago",
    rating: 4,
    text: "Measured, elegant, and full of unexpected connections. The middle essays wander, but the final one brings everything home.",
    likes: 8,
    replies: [],
  },
];

export const Route = createFileRoute("/book/$bookId")({
  head: ({ params }) => {
    const book = books[params.bookId as BookId];
    const title = book ? `${book.title} by ${book.author} — Ex Libris` : "Book — Ex Libris";
    const description = book?.description ?? "Discover this book and join its reader discussion.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: BookDetail,
});

function BookDetail() {
  const { bookId } = Route.useParams();
  const book = books[bookId as BookId];
  const { addItem } = useCart();
  const [borrowed, setBorrowed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [reviews, setReviews] = useState(initialReviews);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [reply, setReply] = useState("");
  const [notice, setNotice] = useState("");

  if (!book) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div>
          <p className="font-mono text-xs uppercase text-primary">Catalog note 404</p>
          <h1 className="mt-2 font-serif text-4xl">This volume isn’t on the shelf.</h1>
          <Button asChild variant="archival" className="mt-6">
            <Link to="/">Return to library</Link>
          </Button>
        </div>
      </main>
    );
  }

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  };

  const publishReview = () => {
    if (!rating || !review.trim()) return;
    setReviews((items) => [
      {
        id: Date.now(),
        initials: "JS",
        name: "Jamie S.",
        time: "Just now",
        rating,
        text: review.trim(),
        likes: 0,
        replies: [],
      },
      ...items,
    ]);
    setRating(0);
    setReview("");
    flash("Your review is now part of the discussion.");
  };

  const publishReply = (reviewId: number) => {
    if (!reply.trim()) return;
    setReviews((items) =>
      items.map((item) =>
        item.id === reviewId
          ? { ...item, replies: [...item.replies, `${reply.trim()} — Jamie S.`] }
          : item,
      ),
    );
    setReply("");
    setReplyingTo(null);
  };

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="font-serif text-xl font-bold italic text-primary">
            Ex Libris
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="archivalGhost">
              <Link to="/">
                <ArrowLeft /> Back to the stacks
              </Link>
            </Button>
            <CartLink />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:py-14">
        <section className="animate-enter grid gap-10 border-b border-border pb-14 lg:grid-cols-[300px_1fr_280px] lg:gap-14">
          <div className="mx-auto w-full max-w-[300px]">
            {book.crop === null ? (
              <img
                src={book.cover}
                alt={`${book.title} book cover`}
                width={768}
                height={1152}
                className="aspect-[2/3] w-full object-cover shadow-2xl"
              />
            ) : (
              <div className={`cover-crop cover-${book.crop} aspect-[2/3] w-full shadow-2xl`}>
                <img src={book.cover} alt={`${book.title} book cover`} width={1536} height={1536} />
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <div className="mb-5 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>{book.year}</span>
              <span>•</span>
              <span>{book.pages} pages</span>
              <span>•</span>
              <span>Shelf {book.shelf}</span>
            </div>
            <h1 className="max-w-2xl font-serif text-4xl font-bold leading-tight md:text-6xl">
              {book.title}
            </h1>
            <p className="mt-3 font-serif text-xl italic text-muted-foreground">by {book.author}</p>
            <div className="mt-7 flex items-center gap-3">
              <span className="text-lg text-primary">
                ★★★★<span className="text-foreground/10">★</span>
              </span>
              <strong>{book.rating}</strong>
              <span className="text-sm text-muted-foreground">
                from {book.ratings} reader ratings
              </span>
            </div>
            <p className="mt-8 max-w-2xl text-base leading-7 text-foreground/75">
              {book.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="archivalGhost" onClick={() => setSaved((value) => !value)}>
                <Heart className={saved ? "fill-current text-primary" : ""} />{" "}
                {saved ? "Saved to list" : "Save to list"}
              </Button>
              <Button
                variant="archivalGhost"
                onClick={() =>
                  document.getElementById("discussion")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <MessageCircle /> Read discussion
              </Button>
            </div>
          </div>

          <aside className="self-center border border-border bg-card p-6 shadow-sm">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Borrowing status
            </p>
            <div className="mt-4 flex items-start gap-3">
              <span
                className={`mt-1 size-2 rounded-full ${book.available > 0 ? "bg-primary" : "bg-muted-foreground"}`}
              />
              <div>
                <p className="font-medium">
                  {borrowed
                    ? "On your desk"
                    : book.available > 0
                      ? "Available now"
                      : "Currently checked out"}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {borrowed
                    ? "Due July 5, 2026 · 21-day loan"
                    : book.available > 0
                      ? `${book.available} ${book.available === 1 ? "copy" : "copies"} ready to borrow`
                      : "Join the waitlist to be notified"}
                </p>
              </div>
            </div>
            <Button
              className="mt-6 w-full"
              variant="archival"
              disabled={borrowed}
              onClick={() => {
                setBorrowed(true);
                flash(`${book.title} is now on your desk.`);
              }}
            >
              <BookOpen />{" "}
              {borrowed ? "Borrowed" : book.available > 0 ? "Borrow for 21 days" : "Join waitlist"}
            </Button>
            {borrowed && (
              <div className="mt-3 flex items-center gap-2 bg-accent px-3 py-2 text-xs text-accent-foreground">
                <Check className="size-4" /> Loan confirmed
              </div>
            )}
            <div className="my-6 border-t border-border" />
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Keep a copy
            </p>
            <p className="mt-2 font-serif text-3xl font-bold">{book.price}</p>
            <p className="mt-1 text-xs text-muted-foreground">Hardcover · Ships in 2–3 days</p>
            <Button
              className="mt-4 w-full"
              variant="archivalOutline"
              onClick={() => {
                addItem({
                  id: bookId,
                  title: book.title,
                  author: book.author,
                  price: Number(book.price.replace("$", "")),
                  cover: book.cover,
                  crop: book.crop,
                });
                flash(`${book.title} added to your basket.`);
              }}
            >
              <ShoppingBag /> Purchase copy
            </Button>
          </aside>
        </section>

        <section id="discussion" className="scroll-mt-24 py-14">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <div className="mb-8 flex items-end justify-between border-b border-border pb-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                    Reader room
                  </p>
                  <h2 className="mt-1 font-serif text-3xl">Reviews & discussion</h2>
                </div>
                <span className="text-sm text-muted-foreground">
                  {reviews.length} conversations
                </span>
              </div>
              <div className="divide-y divide-border">
                {reviews.map((item) => (
                  <article key={item.id} className="py-7 first:pt-0">
                    <div className="flex gap-4">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                        {item.initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm">{item.name}</strong>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {item.time}
                          </span>
                          <span
                            className="ml-auto text-sm text-primary"
                            aria-label={`${item.rating} out of 5 stars`}
                          >
                            {"★".repeat(item.rating)}
                            <span className="text-foreground/10">
                              {"★".repeat(5 - item.rating)}
                            </span>
                          </span>
                        </div>
                        <p className="mt-3 max-w-3xl leading-7 text-foreground/80">{item.text}</p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="archivalGhost"
                            onClick={() =>
                              setReviews((items) =>
                                items.map((reviewItem) =>
                                  reviewItem.id === item.id
                                    ? { ...reviewItem, likes: reviewItem.likes + 1 }
                                    : reviewItem,
                                ),
                              )
                            }
                          >
                            Like ({item.likes})
                          </Button>
                          <Button
                            size="sm"
                            variant="archivalGhost"
                            onClick={() => setReplyingTo(replyingTo === item.id ? null : item.id)}
                          >
                            Reply ({item.replies.length})
                          </Button>
                        </div>
                        {item.replies.length > 0 && (
                          <div className="mt-4 space-y-3 border-l border-primary/20 pl-4">
                            {item.replies.map((text) => (
                              <p key={text} className="text-sm leading-6 text-muted-foreground">
                                {text}
                              </p>
                            ))}
                          </div>
                        )}
                        {replyingTo === item.id && (
                          <div className="mt-4 flex gap-2">
                            <input
                              value={reply}
                              onChange={(event) => setReply(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") publishReply(item.id);
                              }}
                              placeholder={`Reply to ${item.name}...`}
                              className="min-w-0 flex-1 rounded-sm border border-border bg-card px-3 text-sm"
                            />
                            <Button variant="archival" onClick={() => publishReply(item.id)}>
                              Post
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside className="h-fit border border-border bg-card p-6 lg:sticky lg:top-24">
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                Add your voice
              </p>
              <h2 className="mt-2 font-serif text-2xl">Review this book</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Your rating and notes will appear in the reader discussion.
              </p>
              <div className="mt-6 flex gap-1" aria-label={`Your rating: ${rating} out of 5`}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => setRating(value)}
                    aria-label={`Rate ${value} stars`}
                  >
                    <Star
                      className={`size-7 ${value <= rating ? "fill-current text-primary" : "text-border"}`}
                    />
                  </button>
                ))}
              </div>
              <label htmlFor="review" className="mt-6 block text-sm font-medium">
                Your review
              </label>
              <textarea
                id="review"
                value={review}
                onChange={(event) => setReview(event.target.value)}
                rows={6}
                placeholder="Write from the margins..."
                className="mt-2 w-full resize-none rounded-sm border border-border bg-background p-3 text-sm focus:ring-1 focus:ring-ring"
              />
              <Button
                className="mt-4 w-full"
                variant="archival"
                disabled={!rating || !review.trim()}
                onClick={publishReview}
              >
                Publish review
              </Button>
              <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                <Clock3 className="size-4" /> Thoughtful replies are encouraged.
              </div>
            </aside>
          </div>
        </section>
      </main>
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
