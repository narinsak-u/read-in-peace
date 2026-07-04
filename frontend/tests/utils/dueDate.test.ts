import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { daysUntilDue, dueLabel, dueInText, borrowProgress } from "~/utils/dueDate";

describe("daysUntilDue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns positive days for future date", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(daysUntilDue("2026-07-10T12:00:00Z")).toBe(6);
  });

  it("returns 0 for due today", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(daysUntilDue("2026-07-04T23:59:00Z")).toBe(0);
  });

  it("returns 1 for due tomorrow (less than 24h away but next day)", () => {
    vi.setSystemTime(new Date("2026-07-04T23:00:00Z"));
    expect(daysUntilDue("2026-07-05T00:00:00Z")).toBe(1);
  });

  it("returns negative for overdue date", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(daysUntilDue("2026-07-01T12:00:00Z")).toBe(-3);
  });
});

describe("dueLabel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks as OVERDUE with day count for past date", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(dueLabel("2026-07-01T12:00:00Z")).toEqual({
      text: "OVERDUE (3D)",
      urgent: true,
    });
  });

  it("marks as DUE TODAY when 0 days remain", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(dueLabel("2026-07-04T23:59:00Z")).toEqual({
      text: "DUE TODAY",
      urgent: true,
    });
  });

  it("marks DUE IN X DAYS for 1-3 days out", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(dueLabel("2026-07-05T12:00:00Z")).toEqual({
      text: "DUE IN 1 DAYS",
      urgent: true,
    });
    expect(dueLabel("2026-07-07T12:00:00Z")).toEqual({
      text: "DUE IN 3 DAYS",
      urgent: true,
    });
  });

  it("returns formatted date for 4+ days out, not urgent", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    const label = dueLabel("2026-07-20T12:00:00Z");
    expect(label.text).toMatch(/DUE: JUL \d+/);
    expect(label.urgent).toBe(false);
  });
});

describe("dueInText", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns overdue text for past dates", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(dueInText("2026-07-01T12:00:00Z")).toBe("Overdue by 3 days");
  });

  it("returns due today", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(dueInText("2026-07-04T23:59:00Z")).toBe("Due today");
  });

  it("returns due in 1 day for 1 day remaining", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(dueInText("2026-07-05T12:00:00Z")).toBe("Due in 1 day");
  });

  it("returns plural for multiple days", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(dueInText("2026-07-10T12:00:00Z")).toBe("Due in 6 days");
  });
});

describe("borrowProgress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 at start of borrow period", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    // 14 days from now
    expect(borrowProgress("2026-07-18T12:00:00Z")).toBe(0);
  });

  it("returns ~50% halfway through", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    // due in 7 days → 7 elapsed out of 14 → 50%
    expect(borrowProgress("2026-07-11T12:00:00Z")).toBe(50);
  });

  it("returns 100 at due date", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(borrowProgress("2026-07-04T12:00:00Z")).toBe(100);
  });

  it("caps at 100 for overdue", () => {
    vi.setSystemTime(new Date("2026-07-10T12:00:00Z"));
    // 6 days past due date (due was Jul 4)
    expect(borrowProgress("2026-07-04T12:00:00Z")).toBe(100);
  });
});
