import { type Product, formatPrice } from "@/lib/api";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <span className="self-start rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
        {product.category}
      </span>
      <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-gray-900">
        {product.name}
      </h3>
      <p className="mt-auto pt-3 text-lg font-bold text-gray-900">
        {formatPrice(product.price)}
      </p>
    </article>
  );
}
