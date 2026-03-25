import AllergenBadge from "./AllergenBadge";

export default function DishCard({ dish, selectedAllergens, mode }) {
  const dishAllergenNames = dish.allergens.map((a) => a.name);
  const hasConflict = selectedAllergens.some((a) =>
    dishAllergenNames.includes(a)
  );
  const conflicting = selectedAllergens.filter((a) =>
    dishAllergenNames.includes(a)
  );

  return (
    <div
      className={`bg-white rounded-lg shadow p-5 transition ${
        hasConflict && mode === "warn" ? "border-2 border-red-400" : "border border-gray-100"
      }`}
    >
      {hasConflict && mode === "warn" && (
        <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded mb-3 font-medium">
          Contains: {conflicting.join(", ")}
        </div>
      )}
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">{dish.name}</h3>
        <span className="text-lg font-medium text-gray-700">
          £{dish.price.toFixed(2)}
        </span>
      </div>
      {dish.description && (
        <p className="text-gray-500 text-sm mb-3">{dish.description}</p>
      )}
      <div className="flex flex-wrap gap-1">
        {dish.allergens.map((a) => (
          <AllergenBadge
            key={a.id}
            allergen={a}
            highlighted={selectedAllergens.includes(a.name)}
          />
        ))}
      </div>
    </div>
  );
}
