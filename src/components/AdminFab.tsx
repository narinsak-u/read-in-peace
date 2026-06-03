import { Plus } from "lucide-react";
import { useApp } from "@/lib/app-state";

export function AdminFab() {
  const { adminMode } = useApp();
  if (!adminMode) return null;
  return (
    <button
      className="fixed bottom-8 right-8 z-40 flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 animate-fade-up"
    >
      <Plus className="h-5 w-5" />
      <span className="font-medium">Add New Book</span>
    </button>
  );
}
