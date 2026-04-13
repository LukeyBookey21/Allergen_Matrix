import { useState } from "react";

export default function AllergenBadge({ allergen, highlighted, small }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span
      className={`relative inline-flex items-center gap-1 rounded-full font-medium select-none cursor-default
        ${small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}
        ${
          highlighted
            ? "bg-red-500 text-white font-bold ring-1 ring-red-300 shadow-sm shadow-red-200"
            : "bg-stone-100 text-stone-600 ring-1 ring-stone-200"
        }
        transition-all duration-200 hover:scale-105
      `}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className={small ? "text-[10px] leading-none" : "text-sm leading-none"}>
        {allergen.icon_emoji}
      </span>
      <span className="leading-tight">{allergen.name}</span>

      {showTooltip && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-[11px] rounded-lg whitespace-nowrap shadow-xl z-50 pointer-events-none animate-fade-in">
          {highlighted ? (
            <>
              <span className="text-red-300 font-semibold">Warning:</span>{" "}
              Contains {allergen.name}
            </>
          ) : (
            allergen.name
          )}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-800" />
        </span>
      )}
    </span>
  );
}
