import { describe, it, expect } from "vitest";
import { mapFeedPost, type FeedPost } from "~/composables/useFeed";

describe("mapFeedPost", () => {
  it("maps a complete feed post entry", () => {
    const raw = {
      id: "p1",
      text: "Amazing read!",
      rating: 5,
      createdAt: "2026-07-01T12:00:00Z",
      user: { id: "u1", name: "Alice", image: null },
      likeCount: 15,
      likedByUser: true,
      replies: [
        {
          text: "Totally agree",
          user: { name: "Bob" },
        },
      ],
    };

    const post = mapFeedPost(raw);
    expect(post.id).toBe("p1");
    expect(post.text).toBe("Amazing read!");
    expect(post.rating).toBe(5);
    expect(post.user).toEqual({ id: "u1", name: "Alice", image: null });
    expect(post.likeCount).toBe(15);
    expect(post.liked).toBe(true);
    expect(post.replies).toHaveLength(1);
    expect(post.replies[0]).toEqual({ name: "Bob", text: "Totally agree" });
  });

  it("handles no rating", () => {
    const post = mapFeedPost({
      id: "p1", text: "OK", createdAt: "", user: { id: "u1", name: "A", image: null },
      likeCount: 0, replies: [],
    });
    expect(post.rating).toBeNull();
  });

  it("handles missing likedByUser", () => {
    const post = mapFeedPost({
      id: "p1", text: "OK", createdAt: "", user: { id: "u1", name: "A", image: null },
      likeCount: 0, replies: [],
    });
    expect(post.liked).toBe(false);
  });

  it("handles empty replies array", () => {
    const post = mapFeedPost({
      id: "p1", text: "OK", rating: null, createdAt: "",
      user: { id: "u1", name: "A", image: null },
      likeCount: 0, replies: [],
    });
    expect(post.replies).toEqual([]);
    expect(post.replyCount).toBe(0);
  });

  it("handles missing user name in replies", () => {
    const raw = {
      id: "p1", text: "OK", createdAt: "",
      user: { id: "u1", name: "A", image: null },
      likeCount: 0, replies: [
        { text: "nice", user: {} },
      ],
    };
    const post = mapFeedPost(raw);
    expect(post.replies[0].name).toBe("Unknown");
  });

  it("defaults likeCount to 0 when missing", () => {
    const post = mapFeedPost({
      id: "p1", text: "OK", createdAt: "", user: { id: "u1", name: "A", image: null },
      replies: [],
    });
    expect(post.likeCount).toBe(0);
  });
});
