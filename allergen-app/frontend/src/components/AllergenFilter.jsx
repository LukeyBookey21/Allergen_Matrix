export default function AllergenFilter({ allergens, selected, onToggle, onClear }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {selected.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-bold">
                {selected.length}
              </span>
              selected
            </span>
          ) : (
            <span className="text-sm text-slate-400 font-medium">
              Tap to select allergens
            </span>
          )}
        </div>
        {selected.length > 0 && onClear && (
          <button
            onClick={onClear}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors duration-200 font-medium flex items-center gap-1 group"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5 group-hover:rotate-90 transition-transform duration-200"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Clear all
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {allergens.map((allergen) => {
          const isSelected = selected.includes(allergen.name);
          return (
            <button
              key={allergen.id}
              onClick={() => onToggle(allergen.name)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${
                  isSelected
                    ? "bg-red-500 text-white shadow-md shadow-red-200/50 scale-[1.02] ring-2 ring-red-400 ring-offset-1"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300 hover:bg-slate-50 hover:shadow-sm"
                }`}
            >
              <span className="text-lg leading-none flex-shrink-0">
                {allergen.icon_emoji}
              </span>
              <span className="truncate">{allergen.name}</span>
              {isSelected && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 ml-auto flex-shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
