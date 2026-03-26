import AllergenBadge from "./AllergenBadge";

export default function DishCard({ dish, selectedAllergens = [], mode = "warn" }) {
  const dishAllergenNames = dish.allergens.map((a) => a.name);
  const hasConflict = selectedAllergens.some((a) =>
    dishAllergenNames.includes(a)
  );
  const conflicting = selectedAllergens.filter((a) =>
    dishAllergenNames.includes(a)
  );

  return (
    <div
      className={`relative bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group
        ${
          hasConflict && mode === "warn"
            ? "border-l-4 border-l-red-400 border border-red-100"
            : "border border-stone-100 hover:border-stone-200"
        }
      `}
    >
      {/* Special ribbon */}
      {dish.is_special && (
        <div className="ribbon">
          <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-l-md shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 animate-sparkle" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Special
          </span>
        </div>
      )}

      <div className="p-5">
        {/* Warning banner */}
        {hasConflict && mode === "warn" && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-3 font-medium animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Contains: {conflicting.join(", ")}
          </div>
        )}

        {/* Header row */}
        <div className="flex justify-between items-start gap-3 mb-2">
          <h3 className="font-semibold text-lg text-slate-800 group-hover:text-slate-900 transition-colors leading-tight">
            {dish.name}
          </h3>
          <span className="flex-shrink-0 text-lg font-bold text-amber-600 tabular-nums">
            <span className="text-sm font-medium text-amber-500">£</span>
            {Number(dish.price).toFixed(2)}
          </span>
        </div>

        {/* Description */}
        {dish.description && (
          <p className="text-slate-500 text-sm leading-relaxed mb-4">
            {dish.description}
          </p>
        )}

        {/* Allergen badges */}
        {dish.allergens.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-stone-100">
            {dish.allergens.map((a) => (
              <AllergenBadge
                key={a.id}
                allergen={a}
                highlighted={selectedAllergens.includes(a.name)}
                small
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
