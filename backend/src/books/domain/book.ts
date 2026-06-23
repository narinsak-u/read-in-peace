// Book domain types. Defined here so the application layer (services) and the
// presentation layer (controllers, DTOs) can talk about books without knowing
// anything about Drizzle or the database schema.
//
// `BookRow` mirrors the columns of the `books` table and is what the
// infrastructure layer (DrizzleBookRepository) hands to the application. The
// `BookProjection` extends it with read-side aggregates (likes, comments,
// average rating) computed by the read model — controllers consume this for
// the listing/detail endpoints.
//
// We deliberately do NOT import from core/database/schema here; doing so
// would let Drizzle's row type leak into the domain. The DrizzleBookRepository
// is the boundary that maps between the schema and this type.

export interface BookRow {
  id: string;
  slug: string;
  title: string;
  author: string;
  price: string;
  cover: string;
  synopsis: string;
  category: string;
  crop: number | null;
  shelf: string;
  year: number;
  trending: boolean;
  inStock: number;
  isAvailable: boolean;
  totalPages: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewBook {
  slug: string;
  title: string;
  author: string;
  price: string;
  cover: string;
  synopsis: string;
  category: string;
  crop?: number | null;
  shelf: string;
  year: number;
  trending?: boolean;
  totalPages?: number;
  isAvailable?: boolean;
}

export interface UpdateBook {
  slug?: string;
  title?: string;
  author?: string;
  price?: string;
  cover?: string;
  synopsis?: string;
  category?: string;
  crop?: number | null;
  shelf?: string;
  year?: number;
  trending?: boolean;
  totalPages?: number;
  inStock?: number;
  isAvailable?: boolean;
}

export interface BookProjection extends BookRow {
  likeCount: number;
  commentCount: number;
  avgRating: number;
  ratingsCount: number;
}

export interface BookPricing {
  id: string;
  title: string;
  price: string;
  category: string;
  inStock: number;
  isAvailable: boolean;
}
