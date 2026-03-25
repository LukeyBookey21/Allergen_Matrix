import { useState, useEffect } from "react";
import { getMenu, getAllergens } from "../api";
import AllergenFilter from "../components/AllergenFilter";
import DishCard from "../components/DishCard";

export default function CustomerMenu() {
  const [dishes, setDishes] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [selectedAllergens, setSelectedAllergens] = useState([]);
  const [mode, setMode] = useState("warn"); // "warn" or "hide"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [menuData, allergenData] = await Promise.all([
        getMenu(),
        getAllergens(),
      ]);
      setDishes(menuData || []);
      setAllergens(allergenData || []);
      setLoading(false);
    }
    load();
  }, []);

  function toggleAllergen(name) {
    setSelectedAllergens((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  }

  const filteredDishes = dishes.filter((dish) => {
    if (mode !== "hide") return true;
    const dishAllergenNames = dish.allergens.map((a) => a.name);
    return !selectedAllergens.some((a) => dishAllergenNames.includes(a));
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading menu...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Our Menu</h1>
        <p className="text-gray-500">
          Select any allergens below to filter the menu
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-3">I am allergic to...</h2>
        <AllergenFilter
          allergens={allergens}
          selected={selectedAllergens}
          onToggle={toggleAllergen}
        />
        {selectedAllergens.length > 0 && (
          <div className="mt-4 flex items-center gap-4">
            <span className="text-sm text-gray-600">Display mode:</span>
            <button
              onClick={() => setMode("warn")}
              className={`text-sm px-3 py-1 rounded-full border transition ${
                mode === "warn"
                  ? "bg-amber-100 border-amber-300 text-amber-700"
                  : "bg-white border-gray-200 text-gray-500"
              }`}
            >
              Warn me
            </button>
            <button
              onClick={() => setMode("hide")}
              className={`text-sm px-3 py-1 rounded-full border transition ${
                mode === "hide"
                  ? "bg-red-100 border-red-300 text-red-700"
                  : "bg-white border-gray-200 text-gray-500"
              }`}
            >
              Hide dishes
            </button>
          </div>
        )}
      </div>

      {filteredDishes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No dishes match your criteria.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredDishes.map((dish) => (
            <DishCard
              key={dish.id}
              dish={dish}
              selectedAllergens={selectedAllergens}
              mode={mode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
