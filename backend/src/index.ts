import "dotenv/config";
import express, { type Request, type Response } from "express";
import cors from "cors";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { products } from "./db/schema";

const app = express();
const PORT = Number(process.env.PORT) || 3001;
// Accept a comma-separated list of origins; ignore trailing slashes so a value
// like "https://app.vercel.app/" still matches the browser's "https://app.vercel.app".
const stripSlash = (s: string) => s.trim().replace(/\/+$/, "");
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:3000")
  .split(",")
  .map(stripSlash)
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser requests (no Origin header) and any allowed origin.
      if (!origin || allowedOrigins.includes(stripSlash(origin))) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
  })
);
app.use(express.json());

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

interface Cursor {
  created_at: string;
  id: string;
}

/** Parse + clamp the `limit` query param to [1, MAX_LIMIT]. */
function parseLimit(raw: unknown): number {
  const n = parseInt(String(raw ?? ""), 10);
  if (Number.isNaN(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

/** Decode a base64 cursor into { created_at, id }, or null. Throws on malformed input. */
function decodeCursor(raw: string): Cursor {
  const json = Buffer.from(raw, "base64").toString("utf-8");
  const parsed = JSON.parse(json);
  if (
    !parsed ||
    typeof parsed.created_at !== "string" ||
    typeof parsed.id !== "string"
  ) {
    throw new Error("Malformed cursor payload");
  }
  return { created_at: parsed.created_at, id: parsed.id };
}

/** Encode { created_at, id } of the last row into a base64 cursor. */
function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
}

app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "CodeVector Products API",
    status: "ok",
    endpoints: {
      health: "/health",
      products: "/api/products?limit=20&cursor=<base64>&category=<name>",
    },
  });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/api/products", async (req: Request, res: Response) => {
  try {
    const limit = parseLimit(req.query.limit);
    const category =
      typeof req.query.category === "string" && req.query.category.length > 0
        ? req.query.category
        : null;

    let cursor: Cursor | null = null;
    if (typeof req.query.cursor === "string" && req.query.cursor.length > 0) {
      try {
        cursor = decodeCursor(req.query.cursor);
      } catch {
        return res.status(400).json({ error: "Invalid cursor" });
      }
    }

    // Build WHERE conditions.
    const conditions: SQL[] = [];
    if (category) {
      conditions.push(eq(products.category, category));
    }
    if (cursor) {
      // Row-value comparison so (created_at, id) is compared as a tuple.
      // This is the keyset condition that matches ORDER BY created_at DESC, id DESC
      // and correctly handles rows that share the same created_at.
      conditions.push(
        sql`(${products.createdAt}, ${products.id}) < (${cursor.created_at}::timestamptz, ${cursor.id}::uuid)`
      );
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch limit + 1 to detect whether another page exists.
    const rows = await db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(desc(products.createdAt), desc(products.id))
      .limit(limit + 1);

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;

    let nextCursor: string | null = null;
    if (hasNextPage) {
      const last = data[data.length - 1];
      nextCursor = encodeCursor({
        created_at: last.createdAt.toISOString(),
        id: last.id,
      });
    }

    // Live total count, honoring the category filter.
    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(category ? eq(products.category, category) : undefined);
    const total = totalResult[0]?.count ?? 0;

    res.json({ data, nextCursor, total });
  } catch (err) {
    console.error("GET /api/products failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(", ")}`);
});
