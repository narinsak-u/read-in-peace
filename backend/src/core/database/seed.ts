import 'dotenv/config';
import crypto from 'node:crypto';
import { scrypt, randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, sql } from 'drizzle-orm';
import * as schema from './schema';
import { CoreConfigService } from '../config/config.provider';

const config = new CoreConfigService(process.env);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (err, buf) => (err ? reject(err) : resolve(buf)),
    );
  });
  return `${salt}:${key.toString('hex')}`;
}

const covers = [
  'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1531901599143-df5010ab9438?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1629992101753-56d196c8aabb?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1621351183012-e2f9972dd9bf?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1610882648335-ced8fc8fa6b6?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1495640388908-05fa85288e61?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1589998059171-988d887df646?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1474932430478-367dbb6832c1?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1527176930608-09cb256ab504?w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1526243741027-444d633d7365?w=600&auto=format&fit=crop',
];

const titles: [string, string][] = [
  ['The Quiet Hours', 'Elena Marsh'],
  ['Atlas of Small Things', 'Ravi Kapoor'],
  ['Northbound', 'Sigrid Hallman'],
  ['A Patient Year', 'Marcus Webb'],
  ['Letters from Tomorrow', 'June Okafor'],
  ["The Cartographer's Daughter", 'Lila Vance'],
  ['Slowfire', 'Theo Almeida'],
  ['Field Notes on Stillness', 'Anya Petrova'],
  ['The Glass Orchard', 'Hugo Bennet'],
  ['Paper Boats', 'Mei Lin'],
  ['Echoes in November', 'Daniel Ortiz'],
  ['The Last Lighthouse', 'Cora Whitfield'],
  ['Beneath the Canopy', 'Sofia Reyes'],
  ['The Salt Saint', 'Jack Kowalski'],
  ['Orchid & Flame', 'Priya Nair'],
];

const categories = [
  'Fiction',
  'How-to',
  'Fiction',
  'How-to',
  'Fiction',
  'Fiction',
  'Fiction',
  'How-to',
  'Fiction',
  'Manga',
  'Fiction',
  'Fiction',
  'Fiction',
  'How-to',
  'Manga',
];

const synopses = [
  'A quietly luminous novel about memory, distance, and the small rituals that bind us.',
  'An atlas of overlooked wonders \u2014 maps, myths, and the spaces between.',
  'A woman walks north through a changing landscape, leaving everything behind.',
  'One year in the life of a man learning to wait. A meditation on patience and change.',
  'Correspondence across time \u2014 letters that arrive before they are sent.',
  "A daughter inherits her father's maps and discovers a world he never showed her.",
  'In a drought-stricken town, fire becomes a character, a catalyst, a catharsis.',
  'Essays on silence, attention, and the art of doing nothing.',
  'A family saga told through the prism of a single orchard over four generations.',
  'A graphic novel about letting go, folding boats from letters that were never mailed.',
  'November in a small coastal town \u2014 echoes of a love affair told in fragments.',
  "A lighthouse keeper's final season. A story about solitude and its end.",
  'Deep in the rainforest, two strangers find shelter and each other.',
  'A gritty coastal noir about a former boxer who becomes an unlikely saint.',
  'A magical realist romance spanning two continents and one orchid species.',
];

const commentTexts = [
  'Read it in two sittings. The prose has a hush to it.',
  'Beautifully restrained. The second act drifts a little but the ending earned it.',
  "One of those books I'll keep on the nightstand.",
  'Devastating and tender in equal measure.',
  'Could not put this down. The atmosphere is unforgettable.',
  'A slow burn that rewards patience. The last chapter broke me.',
  'Perfect for a rainy weekend. Lyrical and haunting.',
  'Not my usual genre but I was hooked from page one.',
  'The world-building is subtle and masterful.',
  "I've recommended this to everyone I know.",
];

async function seed() {
  const pool = new Pool({ connectionString: config.db.url });
  const db = drizzle(pool, { schema });

  const passwordHash = await hashPassword('seed123');

  // --- Users ---

  // Resolve a user by email, inserting if absent. Returns the canonical user id,
  // which is then used to insert (or no-op) the account row. This makes the
  // seed idempotent: re-running on a populated DB does not generate new UUIDs
  // that would orphan the corresponding `account` rows.
  const upsertUser = async (input: {
    id: string;
    name: string;
    email: string;
  }): Promise<string> => {
    await db
      .insert(schema.user)
      .values({ ...input, emailVerified: true })
      .onConflictDoNothing();
    const [row] = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, input.email))
      .limit(1);
    return row.id;
  };

  const seedUserId = await upsertUser({
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Seed User',
    email: 'seed@readinpace.com',
  });

  // The (providerId, accountId) pair is the natural key for an account row
  // (Better Auth looks up by these). Insert only if it doesn't already exist.
  const upsertAccount = async (input: {
    userId: string;
    providerId: string;
    accountId: string;
    password: string;
  }): Promise<void> => {
    const [existing] = await db
      .select({ id: schema.account.id })
      .from(schema.account)
      .where(
        and(
          eq(schema.account.providerId, input.providerId),
          eq(schema.account.accountId, input.accountId),
        ),
      )
      .limit(1);
    if (existing) return;
    await db
      .insert(schema.account)
      .values({ id: crypto.randomUUID(), ...input });
  };

  await upsertAccount({
    userId: seedUserId,
    providerId: 'credential',
    accountId: 'seed@readinpace.com',
    password: passwordHash,
  });

  console.log('User created: seed@readinpace.com / seed123');

  const commentUserDefs = [
    { id: crypto.randomUUID(), name: 'Hana', email: 'hana@seed.com' },
    { id: crypto.randomUUID(), name: 'Jonas', email: 'jonas@seed.com' },
    { id: crypto.randomUUID(), name: 'Priya', email: 'priya@seed.com' },
  ];

  const commentUsers: Array<{ name: string; email: string; id: string }> = [];
  for (const u of commentUserDefs) {
    const id = await upsertUser(u);
    commentUsers.push({ name: u.name, email: u.email, id });
    await upsertAccount({
      userId: id,
      providerId: 'credential',
      accountId: u.email,
      password: passwordHash,
    });
  }

  console.log(`Created ${commentUsers.length} commenter accounts`);

  // --- Books ---

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/['']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // 7 frontend-specific books with known slugs, local covers, and sprite crop indices
  const featuredBooks = [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      slug: 'architecture-of-memory',
      title: 'The Architecture of Memory',
      author: 'Elena Rossi-Vaughn',
      price: '21.00',
      cover: '/images/architecture-memory.png',
      synopsis:
        'A luminous inquiry into the buildings we remember and the rooms we cannot forget. Moving between memorials, family homes, and imagined cities, Rossi-Vaughn asks how architecture becomes an archive of private and collective life.',
      category: 'How-to',
      crop: null,
      shelf: '720.1 ARC',
      year: 2026,
      trending: true,
      inStock: 3,
      isAvailable: true,
      totalPages: 340,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      slug: 'silent-springs-revisited',
      title: 'Silent Springs Revisited',
      author: 'Marissa Langford',
      price: '19.50',
      cover: '/images/book-cover-sheet.png',
      synopsis:
        "A reflective journey through America's conservation legacy, revisiting the places and ideas that shaped a movement.",
      category: 'How-to',
      crop: 0,
      shelf: '363.7 LAN',
      year: 2025,
      trending: false,
      inStock: 4,
      isAvailable: true,
      totalPages: 320,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000003',
      slug: 'urbanism-2050',
      title: 'Urbanism 2050',
      author: 'Lena Parker',
      price: '27.00',
      cover: '/images/book-cover-sheet.png',
      synopsis:
        'A visionary look at the cities of tomorrow — how technology, climate, and human behavior will reshape urban life by mid-century.',
      category: 'How-to',
      crop: 1,
      shelf: '307.76 PAR',
      year: 2026,
      trending: false,
      inStock: 2,
      isAvailable: true,
      totalPages: 400,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000004',
      slug: 'the-hidden-sea',
      title: 'The Hidden Sea',
      author: 'Eliot Harbor',
      price: '18.50',
      cover: '/images/book-cover-sheet.png',
      synopsis:
        "A journey beneath the surface of the world's oceans, blending natural history, human curiosity, and the strange beauty of the deep into an unforgettable work of narrative nonfiction.",
      category: 'Fiction',
      crop: 2,
      shelf: '551.46 HAR',
      year: 2026,
      trending: true,
      inStock: 5,
      isAvailable: true,
      totalPages: 288,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000005',
      slug: 'logic-and-form',
      title: 'Logic & Form',
      author: 'Adrian Wakefield',
      price: '24.00',
      cover: '/images/book-cover-sheet.png',
      synopsis:
        'Selected essays on reason, beauty, and the hidden structures that shape how we think. Precise without being austere, Wakefield makes philosophy feel wonderfully close at hand.',
      category: 'Fiction',
      crop: 3,
      shelf: '160 WAK',
      year: 2025,
      trending: false,
      inStock: 1,
      isAvailable: true,
      totalPages: 312,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000006',
      slug: 'paper-shadows',
      title: 'Paper Shadows',
      author: 'Maeve Lincoln',
      price: '16.00',
      cover: '/images/book-cover-sheet.png',
      synopsis:
        'Seven short fictions about the stories we tell, the selves we leave behind, and the quiet thresholds between memory and invention.',
      category: 'Fiction',
      crop: 4,
      shelf: 'FIC LIN',
      year: 2026,
      trending: true,
      inStock: 0,
      isAvailable: true,
      totalPages: 224,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000007',
      slug: 'the-long-night',
      title: 'The Long Night',
      author: 'Daniel Hastings',
      price: '19.99',
      cover: '/images/book-cover-sheet.png',
      synopsis:
        'When the world holds its breath, a remote household must decide what they owe one another. An atmospheric novel of isolation, loyalty, and the first light after darkness.',
      category: 'Fiction',
      crop: 5,
      shelf: 'FIC HAS',
      year: 2025,
      trending: false,
      inStock: 2,
      isAvailable: true,
      totalPages: 368,
    },
  ];

  // Additional random catalog books
  const extraBooks = titles.map(([title, author], i) => ({
    id: crypto.randomUUID(),
    slug: slugify(title),
    title,
    author,
    price: String(Math.round((9 + i * 1.7) * 100) / 100),
    cover: covers[i],
    synopsis: synopses[i],
    category: categories[i],
    crop: null,
    shelf: 'GEN',
    year: 2024 + (i % 3),
    trending: false,
    inStock: [5, 3, 10, 9, 1, 8, 4, 7, 10, 3, 1, 5, 2, 0, 10][i],
    isAvailable: true,
    totalPages: [
      340, 280, 420, 310, 256, 380, 440, 290, 360, 200, 320, 400, 270, 350, 190,
    ][i],
  }));

  const allBooks = [...featuredBooks, ...extraBooks];

  // Resolve each book by slug. If the row is new, the random UUID we generated
  // is used; if it was already seeded, we look up the existing ID so the
  // comments and ratings below can reference the canonical row.
  const bookIds: string[] = [];
  for (const book of allBooks) {
    await db
      .insert(schema.books)
      .values({ ...book, createdBy: seedUserId })
      .onConflictDoNothing();
    const [row] = await db
      .select({ id: schema.books.id })
      .from(schema.books)
      .where(eq(schema.books.slug, book.slug))
      .limit(1);
    bookIds.push(row.id);
  }

  console.log(`Created ${allBooks.length} books`);

  // --- Comments (2-3 per book) ---

  const allUsers = [seedUserId, ...commentUsers.map((u) => u.id)];

  // Idempotency: comments and posts lack a natural unique key (any user can
  // post any text on any book), so we gate them with a count check. If the
  // books table already has comments, we skip the comments block entirely.
  const [existingComments] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.comments);
  const commentsAlreadySeeded = Number(existingComments?.n ?? 0) > 0;

  let commentCount = 0;
  if (!commentsAlreadySeeded) {
    for (const bookId of bookIds) {
      const count = 2 + Math.floor(Math.random() * 2);
      const used = new Set<string>();

      for (let j = 0; j < count; j++) {
        let userId: string;
        do {
          userId = allUsers[Math.floor(Math.random() * allUsers.length)];
        } while (used.has(userId));
        used.add(userId);

        const text =
          commentTexts[Math.floor(Math.random() * commentTexts.length)];
        const rating = 3 + Math.floor(Math.random() * 3);
        await db
          .insert(schema.comments)
          .values({ bookId, userId, text, rating });
        commentCount++;
      }
    }
  }

  console.log(
    commentsAlreadySeeded
      ? `Skipped comments (already seeded)`
      : `Created ${commentCount} comments`,
  );

  // --- Ratings (1-4 per book) ---

  let ratingCount = 0;
  for (const bookId of bookIds) {
    const raterCount = 1 + Math.floor(Math.random() * 4);
    const raterPool = [...allUsers]
      .sort(() => Math.random() - 0.5)
      .slice(0, raterCount);

    for (const userId of raterPool) {
      const rating = 3 + Math.floor(Math.random() * 3);
      await db
        .insert(schema.ratings)
        .values({ bookId, userId, rating })
        .onConflictDoNothing();
      ratingCount++;
    }
  }

  console.log(`Created ${ratingCount} ratings`);

  // --- Posts (social feed) ---

  const postTexts = [
    "Rossi-Vaughn's chapter on brutalist memorials is devastating. Did anyone else catch the reference to Rossi's own cemetery design?",
    'Just finished Paper Shadows. A little quiet in the middle, but the ending is worth it.',
    "Looking for recommendations on mid-century urban design. Any classics I'm missing?",
    'Finally started The Quiet Hours — Elena Marsh has such a distinctive voice. Perfect rainy morning read.',
  ];

  const postRatings = [4, 3, null, 5];

  const [existingPosts] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.posts);
  const postsAlreadySeeded = Number(existingPosts?.n ?? 0) > 0;

  if (!postsAlreadySeeded) {
    for (let i = 0; i < postTexts.length; i++) {
      const userId = commentUsers[i % commentUsers.length].id;
      await db.insert(schema.posts).values({
        userId,
        text: postTexts[i],
        rating: postRatings[i],
      });
    }
  }

  console.log(
    postsAlreadySeeded
      ? `Skipped posts (already seeded)`
      : `Created ${postTexts.length} social posts`,
  );

  await pool.end();
  console.log('\nSeed complete!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
