import { describe, it, expect, vi, beforeEach } from "vitest";

const mockOpenAuthModal = vi.fn();
let mockUser: { id: string } | null = null;
let mockSignedIn = false;

vi.mock("~/stores/auth", () => ({
  useAuthStore: () => ({
    get signedIn() {
      return mockSignedIn;
    },
    get user() {
      return mockUser;
    },
    openAuthModal: mockOpenAuthModal,
  }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

describe("useFollow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockSignedIn = false;
  });

  it("opens auth modal when not signed in", async () => {
    const { useFollow } = await import("~/composables/useFollow");
    const { toggle } = useFollow();
    const onUpdate = vi.fn();

    await toggle("u2", onUpdate);

    expect(mockOpenAuthModal).toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("sets error when trying to follow yourself", async () => {
    mockSignedIn = true;
    mockUser = { id: "u1" };

    const { useFollow } = await import("~/composables/useFollow");
    const { toggle, error } = useFollow();
    const onUpdate = vi.fn();

    await toggle("u1", onUpdate);

    expect(error.value).toBe("You cannot follow yourself");
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("calls $fetch and invokes onUpdate on success", async () => {
    mockSignedIn = true;
    mockUser = { id: "u1" };
    mockFetch.mockResolvedValue({ following: true, followerCount: 5 });

    const { useFollow } = await import("~/composables/useFollow");
    const { toggle, submitting } = useFollow();
    const onUpdate = vi.fn();

    await toggle("u2", onUpdate);

    expect(mockFetch).toHaveBeenCalledWith("/api/profiles/u2/follow", {
      method: "POST",
    });
    expect(onUpdate).toHaveBeenCalledWith({
      following: true,
      followerCount: 5,
    });
    expect(submitting.value).toBe(false);
  });

  it("sets error when $fetch fails", async () => {
    mockSignedIn = true;
    mockUser = { id: "u1" };
    mockFetch.mockRejectedValue({ message: "Server error" });

    const { useFollow } = await import("~/composables/useFollow");
    const { toggle, error, submitting } = useFollow();
    const onUpdate = vi.fn();

    await toggle("u2", onUpdate);

    expect(error.value).toBe("Server error");
    expect(submitting.value).toBe(false);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("falls back to default error message", async () => {
    mockSignedIn = true;
    mockUser = { id: "u1" };
    mockFetch.mockRejectedValue({});

    const { useFollow } = await import("~/composables/useFollow");
    const { toggle, error } = useFollow();

    await toggle("u2", vi.fn());

    expect(error.value).toBe("Failed to toggle follow");
  });

  it("sets submitting to true during request", async () => {
    mockSignedIn = true;
    mockUser = { id: "u1" };

    let resolveFetch: (v: any) => void;
    mockFetch.mockImplementation(
      () =>
        new Promise((r) => {
          resolveFetch = r;
        }),
    );

    const { useFollow } = await import("~/composables/useFollow");
    const { toggle, submitting } = useFollow();

    const promise = toggle("u2", vi.fn());
    expect(submitting.value).toBe(true);

    resolveFetch!({ following: true, followerCount: 1 });
    await promise;
    expect(submitting.value).toBe(false);
  });
});
