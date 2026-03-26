import { useEffect, useRef } from "react";

export default function AllergenDrawer({ open, onClose, allergens, selected, onToggle, onClear, mode, onModeChange }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in-fast"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-label="Allergen filter"
        className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl animate-slide-in-right flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            <h2 className="font-display text-xl font-semibold text-slate-800">
              Filter by Allergens
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-stone-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="text-sm text-slate-400 mb-4">
            Select any allergens you need to avoid. Matching dishes will be flagged or hidden.
          </p>

          {/* Allergen grid */}
          <div className="grid grid-cols-2 gap-2">
            {allergens.map((allergen) => {
              const isSelected = selected.includes(allergen.name);
              return (
                <button
                  key={allergen.id}
                  onClick={() => onToggle(allergen.name)}
                  aria-label={`${isSelected ? "Remove" : "Add"} ${allergen.name} allergen filter`}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                    ${
                      isSelected
                        ? "bg-red-50 text-red-700 ring-1 ring-red-200 shadow-sm"
                        : "bg-stone-50 text-slate-600 ring-1 ring-stone-200 hover:ring-stone-300 hover:bg-stone-100"
                    }`}
                >
                  <span className="text-base leading-none flex-shrink-0">
                    {allergen.icon_emoji}
                  </span>
                  <span className="truncate text-left">{allergen.name}</span>
                  {isSelected && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-auto flex-shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mode toggle */}
          {selected.length > 0 && (
            <div className="mt-6 pt-5 border-t border-stone-100">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">
                Display Mode
              </p>
              <div className="flex rounded-xl bg-stone-100 p-1">
                <button
                  onClick={() => onModeChange("warn")}
                  className={`flex-1 text-sm py-2 rounded-lg font-medium transition-all duration-200 ${
                    mode === "warn"
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Warn me
                </button>
                <button
                  onClick={() => onModeChange("hide")}
                  className={`flex-1 text-sm py-2 rounded-lg font-medium transition-all duration-200 ${
                    mode === "hide"
                      ? "bg-white text-red-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Hide dishes
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between">
          {selected.length > 0 ? (
            <button
              onClick={onClear}
              className="text-sm text-slate-400 hover:text-red-500 transition-colors font-medium"
            >
              Clear all
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
