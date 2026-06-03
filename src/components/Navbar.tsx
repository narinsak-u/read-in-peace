import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { User, LogIn, LogOut, Shield, LayoutDashboard, Rss } from "lucide-react";
import { useApp } from "@/lib/app-state";

export function Navbar() {
  const { signedIn, username, toggleAuth, adminMode, toggleAdmin } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          Read<span className="text-primary"> in </span>Pace
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/feed"
            className="hidden items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
            activeProps={{ className: "text-foreground bg-muted" }}
          >
            <Rss className="h-4 w-4" /> Feed
          </Link>
          <Link
            to="/dashboard"
            className="hidden items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
            activeProps={{ className: "text-foreground bg-muted" }}
          >
            <LayoutDashboard className="h-4 w-4" /> My Dashboard
          </Link>

          <div className="relative ml-2">
            <button
              onClick={() => setOpen((o) => !o)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-border transition-transform hover:scale-105"
              aria-label="Profile menu"
            >
              {signedIn ? (
                <span className="text-sm font-semibold">{username.split(" ").map((n) => n[0]).join("")}</span>
              ) : (
                <User className="h-4 w-4" />
              )}
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-60 origin-top-right rounded-xl border border-border bg-popover p-2 shadow-lg animate-fade-up">
                {signedIn ? (
                  <>
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium">{username}</p>
                      <p className="text-xs text-muted-foreground">alex@readinpace.com</p>
                    </div>
                    <div className="my-1 h-px bg-border" />
                    <Link to="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <button
                      onMouseDown={toggleAdmin}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted"
                    >
                      <span className="flex items-center gap-2"><Shield className="h-4 w-4" /> Admin mode</span>
                      <span className={`h-4 w-7 rounded-full transition-colors ${adminMode ? "bg-primary" : "bg-muted-foreground/30"} relative`}>
                        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${adminMode ? "left-3.5" : "left-0.5"}`} />
                      </span>
                    </button>
                    <button onMouseDown={toggleAuth} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-muted">
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </>
                ) : (
                  <button onMouseDown={toggleAuth} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted">
                    <LogIn className="h-4 w-4" /> Sign in
                  </button>
                )}
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
