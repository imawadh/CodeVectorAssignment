import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
}

// Neon requires SSL. `ssl: "require"` works with the cloud connection string.
// If you point this at a local Postgres without SSL, set ssl to false.
export const queryClient = postgres(connectionString, {
  max: 10,
  ssl: "require",
});

export const db = drizzle(queryClient, { schema });
