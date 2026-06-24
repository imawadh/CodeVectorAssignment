import { CATEGORIES, ALL_CATEGORIES } from "@/lib/api";

interface CategoryFilterProps {
  value: string;
  onChange: (category: string) => void;
  disabled?: boolean;
}

export default function CategoryFilter({
  value,
  onChange,
  disabled,
}: CategoryFilterProps) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
      <span>Category</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
      >
        <option value={ALL_CATEGORIES}>All</option>
        {CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </label>
  );
}
