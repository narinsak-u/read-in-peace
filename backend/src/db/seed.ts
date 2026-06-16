import 'dotenv/config';
import crypto from 'node:crypto';
import { scrypt, randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

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
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const passwordHash = await hashPassword('seed123');

  // --- Users ---

  await db
    .insert(schema.user)
    .values({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Seed User',
      email: 'seed@readinpace.com',
      emailVerified: true,
    })
    .onConflictDoNothing();

  await db
    .insert(schema.account)
    .values({
      id: crypto.randomUUID(),
      userId: '00000000-0000-0000-0000-000000000001',
      providerId: 'credential',
      accountId: 'seed@readinpace.com',
      password: passwordHash,
    })
    .onConflictDoNothing();

  console.log('User created: seed@readinpace.com / seed123');

  const commentUsers = [
    { id: crypto.randomUUID(), name: 'Hana', email: 'hana@seed.com' },
    { id: crypto.randomUUID(), name: 'Jonas', email: 'jonas@seed.com' },
    { id: crypto.randomUUID(), name: 'Priya', email: 'priya@seed.com' },
  ];

  for (const u of commentUsers) {
    await db
      .insert(schema.user)
      .values({
        id: u.id,
        name: u.name,
        email: u.email,
        emailVerified: true,
      })
      .onConflictDoNothing();
    await db
      .insert(schema.account)
      .values({
        id: crypto.randomUUID(),
        userId: u.id,
        providerId: 'credential',
        accountId: u.email,
        password: passwordHash,
      })
      .onConflictDoNothing();
  }

  console.log(`Created ${commentUsers.length} commenter accounts`);

  // --- Books ---

  const bookIds = Array.from({ length: 15 }, () => crypto.randomUUID());
  const stockValues = [5, 3, 10, 9, 1, 8, 4, 7, 10, 3, 1, 5, 2, 0, 10];
  const totalPagesValues = [
    340, 280, 420, 310, 256, 380, 440, 290, 360, 200, 320, 400, 270, 350, 190,
  ];

  const booksData = titles.map(([title, author], i) => ({
    id: bookIds[i],
    title,
    author,
    price: String(Math.round((9 + i * 1.7) * 100) / 100),
    cover: covers[i],
    synopsis: synopses[i],
    category: categories[i],
    trending: i < 3,
    inStock: stockValues[i],
    isAvailable: true,
    totalPages: totalPagesValues[i],
    createdBy: '00000000-0000-0000-0000-000000000001',
  }));

  for (const book of booksData) {
    await db.insert(schema.books).values(book).onConflictDoNothing();
  }

  console.log(`Created ${booksData.length} books`);

  // --- Comments (2-3 per book) ---

  const allUsers = [
    '00000000-0000-0000-0000-000000000001',
    ...commentUsers.map((u) => u.id),
  ];
  let commentCount = 0;

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
      await db.insert(schema.comments).values({ bookId, userId, text });
      commentCount++;
    }
  }

  console.log(`Created ${commentCount} comments`);

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

  for (let i = 0; i < postTexts.length; i++) {
    const userId = commentUsers[i % commentUsers.length].id;
    await db.insert(schema.posts).values({
      userId,
      text: postTexts[i],
      rating: postRatings[i],
    });
  }

  console.log(`Created ${postTexts.length} social posts`);

  await pool.end();
  console.log('\nSeed complete!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
