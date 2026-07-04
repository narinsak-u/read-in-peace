import { describe, it, expect } from "vitest";
import { mapBookResponse } from "~/types/book";

describe("mapBookResponse", () => {
  it("maps a complete record to a Book", () => {
    const raw = {
      id: "abc-123",
      slug: "the-great-gatsby",
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      price: "12.99",
      cover: "/covers/gatsby.jpg",
      synopsis: "A story of the fabulously wealthy...",
      category: "fiction",
      crop: 50,
      shelf: "F",
      year: 1925,
      trending: true,
      inStock: 10,
      isAvailable: true,
      totalPages: 180,
      likeCount: 42,
      commentCount: 7,
      avgRating: 4.5,
      ratingsCount: 100,
      createdBy: "admin",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-06-01T00:00:00Z",
    };
    const book = mapBookResponse(raw);
    expect(book.id).toBe("abc-123");
    expect(book.slug).toBe("the-great-gatsby");
    expect(book.price).toBe("12.99");
    expect(book.crop).toBe(50);
    expect(book.year).toBe(1925);
    expect(book.trending).toBe(true);
    expect(book.avgRating).toBe(4.5);
  });

  it("coerces numeric price to string", () => {
    const raw = {
      id: "b1", slug: "b", title: "T", author: "A", cover: "c.jpg",
      synopsis: "", category: "", crop: null, shelf: "", year: 2020,
      trending: false, inStock: 0, isAvailable: true, totalPages: 0,
      likeCount: 0, commentCount: 0, avgRating: 0, ratingsCount: 0,
      createdBy: "", createdAt: "", updatedAt: "",
      price: 9.99,
    };
    expect(mapBookResponse(raw).price).toBe("9.99");
  });

  it("coerces undefined price to '0'", () => {
    const raw = {
      id: "b1", slug: "b", title: "T", author: "A", cover: "c.jpg",
      synopsis: "", category: "", crop: null, shelf: "", year: 2020,
      trending: false, inStock: 0, isAvailable: true, totalPages: 0,
      likeCount: 0, commentCount: 0, avgRating: 0, ratingsCount: 0,
      createdBy: "", createdAt: "", updatedAt: "",
    };
    expect(mapBookResponse(raw).price).toBe("0");
  });

  it("coerces null crop to null", () => {
    const raw = {
      id: "b1", slug: "b", title: "T", author: "A", cover: "c.jpg",
      synopsis: "", category: "", crop: null, shelf: "", year: 2020,
      trending: false, inStock: 0, isAvailable: true, totalPages: 0,
      likeCount: 0, commentCount: 0, avgRating: 0, ratingsCount: 0,
      createdBy: "", createdAt: "", updatedAt: "",
    };
    expect(mapBookResponse(raw).crop).toBeNull();
  });

  it("coerces string avgRating to number", () => {
    const raw = {
      id: "b1", slug: "b", title: "T", author: "A", cover: "c.jpg",
      synopsis: "", category: "", crop: null, shelf: "", year: 2020,
      trending: false, inStock: 0, isAvailable: true, totalPages: 0,
      likeCount: 0, commentCount: 0, avgRating: "4.2", ratingsCount: 0,
      createdBy: "", createdAt: "", updatedAt: "",
    };
    expect(mapBookResponse(raw).avgRating).toBe(4.2);
  });

  it("coerces undefined avgRating to 0", () => {
    const raw = {
      id: "b1", slug: "b", title: "T", author: "A", cover: "c.jpg",
      synopsis: "", category: "", crop: null, shelf: "", year: 2020,
      trending: false, inStock: 0, isAvailable: true, totalPages: 0,
      likeCount: 0, commentCount: 0, ratingsCount: 0,
      createdBy: "", createdAt: "", updatedAt: "",
    };
    expect(mapBookResponse(raw).avgRating).toBe(0);
  });
});
