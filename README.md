# CodeVector — Product Browsing App

A full-stack product browser built around **cursor-based (keyset) pagination** over 200,000 products.

- **`/backend`** — Node.js + Express + TypeScript + Drizzle ORM + PostgreSQL (Neon)
- **`/frontend`** — Next.js 14 (App Router) + TypeScript + Tailwind CSS

The two apps are completely independent — no shared code, no monorepo tooling. Run them in separate terminals.

---

## Prerequisites

- Node.js 18+ and npm
- A PostgreSQL database. The schema and seed are written for **Neon** (the connection uses SSL).

---

## 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # then edit .env and paste your Neon DATABASE_URL
```

`.env`:

```
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
PORT=3001
FRONTEND_ORIGIN=http://localhost:3000
```

### Create the schema

Generate the SQL migration from the Drizzle schema, then apply it:

```bash
npm run generate     # writes a migration to ./drizzle from src/db/schema.ts
npm run migrate      # applies migrations to the database
```

> Quick alternative for local dev: `npm run push` pushes the schema directly without a migration file.

This creates the `products` table plus the two composite indexes:

- `(created_at DESC, id DESC)` — default browsing
- `(category, created_at DESC, id DESC)` — filtered browsing

### Seed 200,000 products

```bash
npm run seed
```

Inserts in batches of 1,000 rows per `INSERT` (200 batches), logging every 10,000 rows. Prices are random integers in **paise** (`99`–`100099`); `created_at`/`updated_at` are spread randomly between 2022-01-01 and today.

### Run the API

```bash
npm run dev          # ts-node, http://localhost:3001
```

| Endpoint | Description |
| --- | --- |
| `GET /health` | `{ "status": "ok" }` |
| `GET /api/products` | Paginated products (see below) |

#### `GET /api/products`

Query params:

| Param | Default | Notes |
| --- | --- | --- |
| `limit` | `20` | Clamped to `1`–`100` |
| `cursor` | — | base64 of `{ created_at, id }` from the last item of the previous page |
| `category` | — | Filters by exact category name |

Response:

```json
{
  "data": [ /* Product[] */ ],
  "nextCursor": "eyJjcmVhdGVkX2F0Ij...",
  "total": 200000
}
```

How pagination works: the query orders by `created_at DESC, id DESC` and fetches `limit + 1` rows. If `limit + 1` rows come back there is another page, so the last returned row is encoded as `nextCursor` and only `limit` rows are sent. The keyset predicate is a true SQL **row-value comparison** — `(created_at, id) < (cursor.created_at, cursor.id)` — so rows that share a `created_at` are never skipped or duplicated. No `OFFSET` is used anywhere. `total` is a live `COUNT(*)` honoring the category filter.

---

## 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # optional; defaults to http://localhost:3001
npm run dev                        # http://localhost:3000
```

`.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Features:

- Responsive product grid (1 → 4 columns) with name, category badge, and price formatted as `₹X.XX` (formatting happens only here; the API always returns integer paise).
- Category dropdown (All + 10 categories). Changing it resets pagination and fetches fresh.
- **Load More** button driven by `nextCursor`; new pages are appended, and the button hides when `nextCursor` is `null`.
- Loading skeleton, empty state, and an error banner if the backend is unreachable.
- A request race-guard (abort + request-id) so fast category switches can't let a stale response overwrite the current list.

---

## Notes

- **Price** is an integer in paise everywhere in the backend and DB; only the frontend divides by 100 for display.
- **Pagination is cursor/keyset only** — there is no offset pagination in the codebase.
- The seed uses **bulk inserts** (arrays of 1,000 rows per `db.insert`), never row-by-row.
