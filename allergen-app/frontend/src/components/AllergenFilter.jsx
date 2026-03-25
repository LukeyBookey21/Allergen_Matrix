export default function AllergenFilter({ allergens, selected, onToggle }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {allergens.map((allergen) => {
        const isSelected = selected.includes(allergen.name);
        return (
          <button
            key={allergen.id}
            onClick={() => onToggle(allergen.name)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
              isSelected
                ? "bg-red-100 border-red-300 text-red-700 font-medium"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <span className="text-lg">{allergen.icon_emoji}</span>
            <span>{allergen.name}</span>
          </button>
        );
      })}
    </div>
  );
}
