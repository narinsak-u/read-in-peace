import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, MessageSquare, Share2, Star, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { getBook, mockReviews } from "@/lib/books";
import { useApp } from "@/lib/app-state";

export const Route = createFileRoute("/book/$id")({
  component: BookPage,
});

function BookPage() {
  const { id } = Route.useParams();
  const book = getBook(id);
  const { borrow, buy, liked, toggleLike } = useApp();
  const [reviews, setReviews] = useState(mockReviews);
  const [draft, setDraft] = useState("");

  if (!book) {
    return (
      <>
        <Navbar />
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <p>Book not found.</p>
          <Link to="/feed" className="mt-4 inline-block text-primary underline">Back to feed</Link>
        </div>
      </>
    );
  }

  const isLiked = !!liked[book.id];

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/feed" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to feed
        </Link>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-start">
          <div className="flex justify-center md:sticky md:top-24">
            <div className="w-full max-w-sm">
              <div className="aspect-[2/3] overflow-hidden rounded-xl shadow-2xl shadow-black/20">
                <img src={book.cover} alt={book.title} className="h-full w-full object-cover" />
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <p className="mb-2 text-sm uppercase tracking-widest text-muted-foreground">{book.author}</p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{book.title}</h1>

            <div className="mt-5 flex items-center gap-4">
              <span className="rounded-full bg-primary-soft px-4 py-1.5 text-sm font-semibold text-primary">
                ${book.price.toFixed(2)}
              </span>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-foreground text-foreground" />
                {book.rating.toFixed(1)} · {reviews.length} reviews
              </div>
            </div>

            <p className="mt-6 text-base leading-relaxed text-muted-foreground">{book.synopsis}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => buy(book.id)}
                className="flex-1 rounded-xl bg-primary px-6 py-3.5 font-medium text-primary-foreground transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/30"
              >
                Buy Now — ${book.price.toFixed(2)}
              </button>
              <button
                onClick={() => borrow(book.id)}
                className="flex-1 rounded-xl border border-border px-6 py-3.5 font-medium transition-colors hover:bg-muted"
              >
                Borrow
              </button>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={() => toggleLike(book.id)}
                className={`flex h-11 w-11 items-center justify-center rounded-full border border-border transition-all hover:bg-muted ${isLiked ? "text-destructive" : ""}`}
              >
                <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
              </button>
              <button className="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted">
                <MessageSquare className="h-4 w-4" />
              </button>
              <button className="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted">
                <Share2 className="h-4 w-4" />
              </button>
            </div>

            <section className="mt-12 border-t border-border pt-10">
              <h2 className="text-2xl font-semibold tracking-tight">Reviews</h2>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  setReviews([{ user: "You", avatar: "Y", rating: 5, text: draft.trim() }, ...reviews]);
                  setDraft("");
                }}
                className="mt-6 rounded-2xl border border-border bg-card p-4"
              >
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Leave a review…"
                  rows={3}
                  className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
                  >
                    Post review
                  </button>
                </div>
              </form>

              <div className="mt-8 space-y-6">
                {reviews.map((r, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {r.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{r.user}</p>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star
                              key={idx}
                              className={`h-3.5 w-3.5 ${idx < r.rating ? "fill-foreground text-foreground" : "text-muted-foreground/30"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>

    </>
  );
}
