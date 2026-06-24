export interface Product {
  id: string;
  name: string;
  category: string;
  /** Integer price in paise. Format to rupees in the UI only. */
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsResponse {
  data: Product[];
  nextCursor: string | null;
  total: number;
}

export const CATEGORIES = [
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

/** Sentinel for "no category filter". */
export const ALL_CATEGORIES = "All";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface FetchProductsArgs {
  category: string;
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal;
}

export async function fetchProducts({
  category,
  cursor,
  limit = 20,
  signal,
}: FetchProductsArgs): Promise<ProductsResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  if (category && category !== ALL_CATEGORIES) params.set("category", category);

  const res = await fetch(`${API_URL}/api/products?${params.toString()}`, {
    signal,
  });

  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }

  return res.json() as Promise<ProductsResponse>;
}

/** Format an integer paise amount as ₹X.XX with Indian digit grouping. */
export function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
