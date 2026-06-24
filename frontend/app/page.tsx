"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Product,
  type ProductsResponse,
  fetchProducts,
  ALL_CATEGORIES,
} from "@/lib/api";
import ProductGrid from "@/components/ProductGrid";
import CategoryFilter from "@/components/CategoryFilter";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Race guard: only the most recent request is allowed to commit results.
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (opts: { category: string; cursor: string | null; reset: boolean }) => {
      const { category, cursor, reset } = opts;

      // Cancel any in-flight request and stamp this one as the latest.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const reqId = ++requestIdRef.current;

      if (reset) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const res: ProductsResponse = await fetchProducts({
          category,
          cursor: cursor ?? undefined,
          signal: controller.signal,
        });

        // A newer request superseded this one — drop the result.
        if (reqId !== requestIdRef.current) return;

        setProducts((prev) => (reset ? res.data : [...prev, ...res.data]));
        setNextCursor(res.nextCursor);
        setTotal(res.total);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (reqId !== requestIdRef.current) return;
        setError("Failed to load products. Is the backend running on the API URL?");
      } finally {
        if (reqId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    []
  );

  // Fetch fresh whenever the category changes (resets pagination).
  useEffect(() => {
    load({ category, cursor: null, reset: true });
  }, [category, load]);

  const handleLoadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    load({ category, cursor: nextCursor, reset: false });
  }, [nextCursor, loadingMore, category, load]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Browser</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total.toLocaleString("en-IN")} product{total === 1 ? "" : "s"}
            {category !== ALL_CATEGORIES ? ` in ${category}` : ""}
          </p>
        </div>
        <CategoryFilter value={category} onChange={setCategory} disabled={loading} />
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <GridSkeleton />
      ) : products.length === 0 && !error ? (
        <p className="py-16 text-center text-gray-500">No products found.</p>
      ) : (
        <>
          <ProductGrid products={products} />

          <div className="mt-8 flex justify-center">
            {nextCursor ? (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? "Loading…" : "Load More"}
              </button>
            ) : (
              products.length > 0 && (
                <p className="text-sm text-gray-400">You&apos;ve reached the end.</p>
              )
            )}
          </div>
        </>
      )}
    </main>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-xl border border-gray-200 bg-white p-4"
        >
          <div className="h-4 w-20 rounded-full bg-gray-200" />
          <div className="mt-3 h-4 w-3/4 rounded bg-gray-200" />
          <div className="mt-6 h-5 w-16 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
