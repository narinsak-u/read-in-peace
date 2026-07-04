export function daysUntilDue(dueAt: string): number {
  const due = new Date(dueAt);
  const now = new Date();
  const dueDate = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
}

export function dueLabel(dueAt: string): { text: string; urgent: boolean } {
  const diffDays = daysUntilDue(dueAt);
  if (diffDays < 0)
    return { text: `OVERDUE (${Math.abs(diffDays)}D)`, urgent: true };
  if (diffDays === 0) return { text: "DUE TODAY", urgent: true };
  if (diffDays <= 3) return { text: `DUE IN ${diffDays} DAYS`, urgent: true };
  const due = new Date(dueAt);
  const month = due.toLocaleDateString("en-US", { month: "short" });
  const day = due.getDate();
  return { text: `DUE: ${month.toUpperCase()} ${day}`, urgent: false };
}

export function dueInText(dueAt: string): string {
  const diffDays = daysUntilDue(dueAt);
  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} days`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due in 1 day";
  return `Due in ${diffDays} days`;
}

// assume 14-day borrowing period
export function borrowProgress(dueAt: string): number {
  const remaining = daysUntilDue(dueAt);
  const elapsed = Math.max(0, 14 - remaining);
  return Math.min(100, Math.round((elapsed / 14) * 100));
}
