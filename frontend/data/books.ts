export interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  cover: string;
  synopsis: string;
  rating: number;
  category: string;
  trending?: boolean;
}

const covers = [
  "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1531901599143-df5010ab9438?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1629992101753-56d196c8aabb?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1621351183012-e2f9972dd9bf?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1610882648335-ced8fc8fa6b6?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1495640388908-05fa85288e61?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1589998059171-988d887df646?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1474932430478-367dbb6832c1?w=600&auto=format&fit=crop",
];

const titles: [string, string][] = [
  ["The Quiet Hours", "Elena Marsh"],
  ["Atlas of Small Things", "Ravi Kapoor"],
  ["Northbound", "Sigrid Hallman"],
  ["A Patient Year", "Marcus Webb"],
  ["Letters from Tomorrow", "June Okafor"],
  ["The Cartographer's Daughter", "Lila Vance"],
  ["Slowfire", "Theo Almeida"],
  ["Field Notes on Stillness", "Anya Petrova"],
  ["The Glass Orchard", "Hugo Bennet"],
  ["Paper Boats", "Mei Lin"],
  ["Echoes in November", "Daniel Ortiz"],
  ["The Last Lighthouse", "Cora Whitfield"],
];

const synopsis =
  "A quietly luminous novel about memory, distance, and the small rituals that bind us. Across one slow year, four lives converge on a coastline that refuses to stay still.";

const categories = [
  "Fiction", "How-to", "Fiction", "How-to", "Fiction",
  "Fiction", "Fiction", "How-to", "Fiction", "Manga",
  "Fiction", "Fiction",
];

export const books: Book[] = titles.map(([title, author], i) => ({
  id: String(i + 1),
  title,
  author,
  price: Math.round((9 + i * 1.7) * 100) / 100,
  cover: covers[i % covers.length],
  synopsis,
  rating: 3.8 + ((i * 0.13) % 1.2),
  category: categories[i],
  trending: i < 3,
}));

export const getBook = (id: string) => books.find((b) => b.id === id);

export interface Review {
  user: string;
  avatar: string;
  rating: number;
  text: string;
}

export const mockReviews: Review[] = [
  {
    user: "Hana",
    avatar: "H",
    rating: 5,
    text: "Read it in two sittings. The prose has a hush to it — like the world goes quieter while you're inside.",
  },
  {
    user: "Jonas",
    avatar: "J",
    rating: 4,
    text: "Beautifully restrained. The second act drifts a little but the ending earned it.",
  },
  {
    user: "Priya",
    avatar: "P",
    rating: 5,
    text: "One of those books I'll keep on the nightstand. Already lent my copy to a friend.",
  },
];
