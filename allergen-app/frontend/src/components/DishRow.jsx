export default function DishRow({ dish, selectedAllergens = [], mode = "warn", hidePrice = false, compact = false, onAddToCart }) {
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
      <div className="flex items-start gap-3">
        {/* Left side: name, dietary, price, description, allergens */}
        <div className="flex-1 min-w-0">
          {/* Name + price row */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <h3
              className={`font-display font-semibold text-slate-800 ${
                compact ? "text-sm" : "text-base sm:text-lg"
              } leading-tight`}
            >
              {dish.name}
              {dish.is_special && (
                <span className="ml-1.5 text-amber-500 text-sm align-middle">*</span>
              )}
            </h3>
            {dish.dietary_labels && dish.dietary_labels.split(",").map(label => label.trim()).filter(Boolean).map(label => (
              <span
                key={label}
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold flex-shrink-0 ${
                  label === "VG" ? "bg-green-600 text-white" :
                  label === "V" ? "bg-green-500 text-white" :
                  label === "GF" ? "bg-amber-500 text-white" :
                  "bg-slate-400 text-white"
                }`}
                title={label === "V" ? "Vegetarian" : label === "VG" ? "Vegan" : label === "GF" ? "Gluten Free" : label}
              >
                {label}
              </span>
            ))}
            {!hidePrice && dish.price > 0 && (
              <span className="text-amber-700 font-semibold tabular-nums ml-auto">
                £{Number(dish.price).toFixed(2)}
              </span>
            )}
          </div>

          {/* Description */}
          {dish.description && (
            <p className={`text-slate-500 italic leading-relaxed mt-0.5 ${compact ? "text-xs" : "text-sm"}`}>
              {dish.description}
            </p>
          )}

          {/* Allergen dots */}
          {dish.allergens && dish.allergens.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              {dish.allergens.map((a) => {
                const isConflict = selectedAllergens.includes(a.name);
                return (
                  <span
                    key={a.id}
                    title={a.name}
                    className={`inline-flex items-center justify-center text-xs leading-none cursor-default transition-all duration-200 ${
                      isConflict ? "allergen-dot-conflict" : "opacity-40 hover:opacity-70"
                    }`}
                  >
                    {a.icon_emoji}
                  </span>
                );
              })}
              {hasConflict && mode === "warn" && (
                <span className="text-[10px] text-red-400 font-medium ml-1">allergen</span>
              )}
            </div>
          )}
        </div>

        {/* Add to cart button — always right-aligned, never overlapping */}
        {onAddToCart && (
          <button
            onClick={() => onAddToCart(dish)}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center transition-all duration-200 hover:bg-amber-600 active:scale-95 text-lg font-bold shadow-sm mt-0.5"
            aria-label={`Add ${dish.name} to order`}
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}
