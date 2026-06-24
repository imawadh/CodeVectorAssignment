import "dotenv/config";
import { db, queryClient } from "./db";
import { products, type NewProduct } from "./db/schema";

const CATEGORIES = [
  "Electronics",
  "Clothing",
  "Books",
  "Home & Kitchen",
  "Sports",
  "Toys",
  "Beauty",
  "Automotive",
  "Grocery",
  "Furniture",
] as const;

const ADJECTIVES = [
  "Premium",
  "Deluxe",
  "Classic",
  "Modern",
  "Smart",
  "Eco",
  "Ultra",
  "Compact",
  "Luxury",
  "Essential",
  "Rugged",
  "Sleek",
  "Vintage",
  "Portable",
  "Heavy-Duty",
];

const NOUNS = [
  "Widget",
  "Gadget",
  "Device",
  "Tool",
  "Kit",
  "Set",
  "Pack",
  "Gear",
  "Accessory",
  "Appliance",
  "Bundle",
  "Module",
  "Station",
  "Organizer",
  "Companion",
];

const TOTAL = 200_000;
const BATCH_SIZE = 1_000;
const START_DATE = new Date("2022-01-01T00:00:00.000Z").getTime();
const END_DATE = Date.now();

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildRow(n: number): NewProduct {
  // Spread created_at / updated_at randomly across the window; keep them identical per row.
  const ts = new Date(randInt(START_DATE, END_DATE));
  return {
    name: `${pick(ADJECTIVES)} ${pick(NOUNS)} ${n}`,
    category: pick(CATEGORIES),
    price: randInt(99, 100099), // integer paise, ₹0.99 – ₹1000.99
    createdAt: ts,
    updatedAt: ts,
  };
}

async function seed() {
  const startedAt = Date.now();
  console.log(`Seeding ${TOTAL.toLocaleString()} products in batches of ${BATCH_SIZE}...`);

  let inserted = 0;
  for (let batchStart = 0; batchStart < TOTAL; batchStart += BATCH_SIZE) {
    const rows: NewProduct[] = new Array(BATCH_SIZE);
    for (let i = 0; i < BATCH_SIZE; i++) {
      rows[i] = buildRow(batchStart + i + 1);
    }

    // Bulk insert: one INSERT with 1,000 value rows — never row-by-row.
    await db.insert(products).values(rows);

    inserted += rows.length;
    if (inserted % 10_000 === 0) {
      console.log(`Inserted ${inserted.toLocaleString()} / ${TOTAL.toLocaleString()}`);
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`Done. Inserted ${inserted.toLocaleString()} products in ${elapsed}s.`);
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
