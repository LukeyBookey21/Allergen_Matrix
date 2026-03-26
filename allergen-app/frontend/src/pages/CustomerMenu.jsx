import { useState, useEffect } from "react";
import { getMenu, getAllergens, fetchCategories } from "../api";
import AllergenFilter from "../components/AllergenFilter";
import DishCard from "../components/DishCard";

export default function CustomerMenu() {
  const [dishes, setDishes] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedAllergens, setSelectedAllergens] = useState([]);
  const [mode, setMode] = useState("warn");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [menuData, allergenData, categoryData] = await Promise.all([
        getMenu(),
        getAllergens(),
        fetchCategories().catch(() => []),
      ]);
      setDishes(menuData || []);
      setAllergens(allergenData || []);
      setCategories(categoryData || []);
      setLoading(false);
    }
    load();
  }, []);

  function toggleAllergen(name) {
    setSelectedAllergens((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  }

  function clearAllergens() {
    setSelectedAllergens([]);
  }

  const filteredDishes = dishes.filter((dish) => {
    if (mode !== "hide") return true;
    const dishAllergenNames = dish.allergens.map((a) => a.name);
    return !selectedAllergens.some((a) => dishAllergenNames.includes(a));
  });

  const specials = filteredDishes.filter((d) => d.is_special);

  // Group dishes by category
  const categoryOrder = categories.length > 0 ? categories : ["Starters", "Mains", "Desserts", "Sides"];
  const grouped = {};
  for (const dish of filteredDishes) {
    if (dish.is_special) continue; // Specials shown separately
    const cat = dish.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(dish);
  }
  // Order categories
  const orderedCategories = categoryOrder.filter((c) => grouped[c]?.length > 0);
  // Add any categories not in the predefined order
  Object.keys(grouped).forEach((c) => {
    if (!orderedCategories.includes(c)) orderedCategories.push(c);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-slate-400 text-sm font-medium">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Restaurant header */}
      <header className="bg-slate-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-1">
            Curious Kitchen
          </h1>
          <p className="text-slate-400 text-sm tracking-widest uppercase font-medium">
            Thorpe Park Hotel &amp; Spa
          </p>
        </div>
      </header>

      {/* Sticky allergen filter */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <h2 className="text-base font-semibold text-slate-700">
              I'm allergic to...
            </h2>
          </div>

          <AllergenFilter
            allergens={allergens}
            selected={selectedAllergens}
            onToggle={toggleAllergen}
            onClear={clearAllergens}
          />

          {/* Mode toggle */}
          {selectedAllergens.length > 0 && (
            <div className="mt-3 flex items-center gap-3 animate-fade-in">
              <span className="text-xs text-slate-400 uppercase tracking-wide font-medium">
                Mode:
              </span>
              <div className="inline-flex rounded-lg bg-stone-100 p-0.5">
                <button
                  onClick={() => setMode("warn")}
                  className={`text-sm px-4 py-1.5 rounded-md font-medium transition-all duration-200 ${
                    mode === "warn"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Warn me
                  </span>
                </button>
                <button
                  onClick={() => setMode("hide")}
                  className={`text-sm px-4 py-1.5 rounded-md font-medium transition-all duration-200 ${
                    mode === "hide"
                      ? "bg-red-500 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                    Hide dishes
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Menu content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {filteredDishes.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-100 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">
              No dishes match your filters
            </h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto">
              Try removing some allergen filters or switch to "Warn me" mode to see all dishes with warnings.
            </p>
            <button
              onClick={() => { clearAllergens(); setMode("warn"); }}
              className="mt-4 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            {/* Today's Specials */}
            {specials.length > 0 && (
              <section className="mb-8 animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <span className="animate-sparkle text-amber-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </span>
                  <h2 className="font-display text-2xl font-bold text-slate-800">
                    Today's Specials
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 stagger-children">
                  {specials.map((dish) => (
                    <DishCard
                      key={dish.id}
                      dish={dish}
                      selectedAllergens={selectedAllergens}
                      mode={mode}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Grouped by category */}
            {orderedCategories.map((category) => (
              <section key={category} className="mb-8 animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-display text-2xl font-bold text-slate-800">
                    {category}
                  </h2>
                  <div className="flex-1 h-px bg-stone-200" />
                  <span className="text-xs text-stone-400 font-medium">
                    {grouped[category].length} {grouped[category].length === 1 ? "dish" : "dishes"}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 stagger-children">
                  {grouped[category].map((dish) => (
                    <DishCard
                      key={dish.id}
                      dish={dish}
                      selectedAllergens={selectedAllergens}
                      mode={mode}
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-slate-400">
            Please inform your server of any allergies. Allergen information is provided as a guide.
          </p>
        </div>
      </footer>
    </div>
  );
}
