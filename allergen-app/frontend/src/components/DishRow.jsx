export default function DishRow({ dish, selectedAllergens = [], mode = "warn", hidePrice = false, compact = false }) {
  const dishAllergenNames = dish.allergens ? dish.allergens.map((a) => a.name) : [];
  const hasConflict = selectedAllergens.some((a) => dishAllergenNames.includes(a));
  const isHidden = hasConflict && mode === "hide";

  if (isHidden) return null;

  return (
    <div
      className={`menu-row group ${
        hasConflict && mode === "warn" ? "menu-row-conflict" : ""
      } ${compact ? "py-2.5" : "py-4"}`}
    >
      {/* Name and price line */}
      <div className="flex items-baseline gap-2">
        <h3
          className={`font-display font-semibold text-slate-800 ${
            compact ? "text-base" : "text-lg"
          } leading-tight flex-shrink-0`}
        >
          {dish.name}
          {dish.is_special && (
            <span className="ml-2 text-amber-500 text-sm align-middle">*</span>
          )}
        </h3>
        {!hidePrice && dish.price > 0 && (
          <>
            <span className="menu-row-dots" />
            <span className="text-amber-700 font-semibold tabular-nums flex-shrink-0">
              {Number(dish.price).toFixed(2)}
            </span>
          </>
        )}
      </div>

      {/* Description */}
      {dish.description && (
        <p className={`text-slate-500 italic leading-relaxed mt-1 ${compact ? "text-xs" : "text-sm"}`}>
          {dish.description}
        </p>
      )}

      {/* Allergen dots - small and subtle */}
      {dish.allergens && dish.allergens.length > 0 && (
        <div className="flex items-center gap-1 mt-1.5">
          {dish.allergens.map((a) => {
            const isConflict = selectedAllergens.includes(a.name);
            return (
              <span
                key={a.id}
                title={a.name}
                className={`inline-flex items-center justify-center text-xs leading-none cursor-default transition-all duration-200 ${
                  isConflict
                    ? "allergen-dot-conflict"
                    : "opacity-40 hover:opacity-70"
                }`}
              >
                {a.icon_emoji}
              </span>
            );
          })}
          {hasConflict && mode === "warn" && (
            <span className="text-[10px] text-red-400 font-medium ml-1">
              allergen
            </span>
          )}
        </div>
      )}
    </div>
  );
}
