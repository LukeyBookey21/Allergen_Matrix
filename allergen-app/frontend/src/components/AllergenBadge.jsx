export default function AllergenBadge({ allergen, highlighted, small }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${
        small ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
      } ${
        highlighted
          ? "bg-red-100 border-red-300 text-red-700"
          : "bg-gray-50 border-gray-200 text-gray-600"
      }`}
      title={allergen.name}
    >
      <span>{allergen.icon_emoji}</span>
      <span>{allergen.name}</span>
    </span>
  );
}
