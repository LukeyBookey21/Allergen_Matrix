import { useState } from "react";

export default function DishRow({ dish, selectedAllergens = [], mode = "warn", hidePrice = false, compact = false, onAddToCart, pairings = [] }) {
  const [showPairingTip, setShowPairingTip] = useState(false);

  const dishAllergenNames = dish.allergens ? dish.allergens.map((a) => a.name) : [];
  const hasConflict = selectedAllergens.some((a) => dishAllergenNames.includes(a));
  const isHidden = hasConflict && mode === "hide";

  if (isHidden) return null;

  const pairingNames = pairings.map((p) => p.name || p.drink_name || p).join(", ");

  return (
    <div
      className={`menu-row group ${
        hasConflict && mode === "warn" ? "menu-row-conflict" : ""
      } ${compact ? "py-2.5" : "py-4"}`}
    >
      {/* Name and price line */}
      <div className="flex items-center gap-2">
        <div className="flex items-baseline gap-2 flex-1 min-w-0">
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
            <>
              <span className="menu-row-dots" />
              <span className="text-amber-700 font-semibold tabular-nums flex-shrink-0">
                £{Number(dish.price).toFixed(2)}
              </span>
            </>
          )}

          {/* Pairing hint */}
          {pairings.length > 0 && pairingNames && (
            <span
              className="relative flex-shrink-0 cursor-default ml-1"
              onMouseEnter={() => setShowPairingTip(true)}
              onMouseLeave={() => setShowPairingTip(false)}
              onFocus={() => setShowPairingTip(true)}
              onBlur={() => setShowPairingTip(false)}
              onTouchStart={() => setShowPairingTip((v) => !v)}
              tabIndex={0}
            >
              <span className="text-xs opacity-40 hover:opacity-70 transition-opacity">🍷</span>
              {showPairingTip && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-[11px] rounded-lg whitespace-nowrap shadow-lg z-30 pointer-events-none">
                  Pairs well with: {pairingNames}
                  <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
                </span>
              )}
            </span>
          )}
        </div>

        {/* Add to cart button */}
        {onAddToCart && (
          <button
            onClick={() => onAddToCart(dish)}
            className="flex-shrink-0 w-11 h-11 rounded-full bg-amber-500 text-white flex items-center justify-center transition-all duration-200 hover:bg-amber-600 hover:scale-110 active:scale-95 text-lg font-bold shadow-md"
            aria-label={`Add ${dish.name} to order`}
          >
            +
          </button>
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
