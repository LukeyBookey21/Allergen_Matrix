import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getMe,
  getAdminDishes,
  createDish,
  updateDish,
  detectAllergens,
} from "../api";
import DishCard from "../components/DishCard";

const ALL_ALLERGENS = [
  "Celery",
  "Gluten",
  "Crustaceans",
  "Eggs",
  "Fish",
  "Lupin",
  "Milk",
  "Molluscs",
  "Mustard",
  "Peanuts",
  "Sesame",
  "Soybeans",
  "Sulphites",
  "Tree Nuts",
];

const ALLERGEN_EMOJIS = {
  Celery: "\ud83e\udd6c",
  Gluten: "\ud83c\udf3e",
  Crustaceans: "\ud83e\udd80",
  Eggs: "\ud83e\udd5a",
  Fish: "\ud83d\udc1f",
  Lupin: "\ud83c\udf3b",
  Milk: "\ud83e\udd5b",
  Molluscs: "\ud83d\udc19",
  Mustard: "\ud83c\udfb5",
  Peanuts: "\ud83e\udd5c",
  Sesame: "\ud83c\udf30",
  Soybeans: "\ud83c\udf31",
  Sulphites: "\ud83e\uddea",
  "Tree Nuts": "\ud83c\udf30",
};

const CATEGORIES = ["Starters", "Mains", "Desserts", "Sides"];

export default function AddEditDish() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Mains");
  const [isSpecial, setIsSpecial] = useState(false);
  const [ingredients, setIngredients] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState([]);
  const [aiDetectedAllergens, setAiDetectedAllergens] = useState([]);
  const [detectionResult, setDetectionResult] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const me = await getMe();
      if (!me) return;

      if (isEdit) {
        const dishes = await getAdminDishes();
        const dish = dishes?.find((d) => d.id === parseInt(id));
        if (dish) {
          setName(dish.name);
          setDescription(dish.description || "");
          setPrice(String(dish.price));
          setCategory(dish.category || "Mains");
          setIsSpecial(dish.is_special || false);
          setIngredients(
            dish.ingredients.map((i) => i.raw_text).join("\n")
          );
          setSelectedAllergens(dish.allergens.map((a) => a.name));
        }
      }
      setLoading(false);
    }
    init();
  }, [id, isEdit]);

  async function handleDetect() {
    if (!ingredients.trim()) return;
    setDetecting(true);
    try {
      const result = await detectAllergens(ingredients);
      setDetectionResult(result);
      setAiDetectedAllergens(result.allergens || []);
      setSelectedAllergens(result.allergens || []);
    } catch {
      setDetectionResult({ allergens: [], ai_warnings: ["Detection failed"] });
    }
    setDetecting(false);
  }

  function toggleAllergen(allergenName) {
    setSelectedAllergens((prev) =>
      prev.includes(allergenName) ? prev.filter((a) => a !== allergenName) : [...prev, allergenName]
    );
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    const data = {
      name,
      description,
      price: parseFloat(price) || 0,
      category,
      is_special: isSpecial,
      ingredients,
      allergen_names: selectedAllergens,
    };

    if (isEdit) {
      await updateDish(id, data);
    } else {
      await createDish(data);
    }
    navigate("/admin");
  }

  // Preview dish object
  const previewDish = {
    id: 0,
    name: name || "Dish Name",
    description: description || "Dish description will appear here...",
    price: parseFloat(price) || 0,
    category,
    is_special: isSpecial,
    allergens: selectedAllergens.map((a, i) => ({
      id: i,
      name: a,
      icon_emoji: ALLERGEN_EMOJIS[a] || "\u26a0\ufe0f",
    })),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-slate-400 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-slate-800 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin")}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <h1 className="font-display text-xl font-bold">
              {isEdit ? "Edit Dish" : "Add New Dish"}
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Form */}
          <form onSubmit={handleSave} className="lg:col-span-3 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
              <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                Basic Info
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    Dish Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Pan-Seared Sea Bass"
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder:text-slate-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="A short description of the dish..."
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none placeholder:text-slate-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">
                      Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                        £
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full border border-stone-200 rounded-xl pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder:text-slate-300"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Special toggle */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Mark as Special</p>
                    <p className="text-xs text-slate-400">Highlighted in the customer menu</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSpecial(!isSpecial)}
                    className={`toggle-switch ${isSpecial ? "bg-amber-500" : "bg-stone-300"}`}
                  >
                    <span className={`toggle-dot ${isSpecial ? "translate-x-5" : "translate-x-1"}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Ingredients */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
              <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Ingredients
              </h2>

              <textarea
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                rows={6}
                placeholder={"200g chicken breast\n1 tsp curry paste\n100ml coconut milk"}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent font-mono resize-none placeholder:text-slate-300"
              />
              <p className="text-xs text-slate-400 mt-1.5 mb-3">
                Enter one ingredient per line. Include quantities for best allergen detection.
              </p>

              <button
                type="button"
                onClick={handleDetect}
                disabled={detecting || !ingredients.trim()}
                className="inline-flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl hover:bg-slate-700 transition-all text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {detecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Detecting...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    Detect Allergens
                  </>
                )}
              </button>

              {/* Detection result */}
              {detectionResult && (
                <div className="mt-4 rounded-xl border border-stone-100 p-4 bg-stone-50 animate-fade-in">
                  {detectionResult.allergens?.length > 0 ? (
                    <p className="text-sm text-green-700 font-medium mb-1">
                      Detected {detectionResult.allergens.length} allergen(s)
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500">No allergens detected.</p>
                  )}
                  {detectionResult.ai_used && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                        </svg>
                        AI-assisted
                      </span>
                    </div>
                  )}
                  {detectionResult.ai_warnings?.map((w, i) => (
                    <p key={i} className="text-xs text-red-600 mt-1">{w}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Allergens */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
              <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Allergens
              </h2>
              <p className="text-xs text-slate-400 mb-3">
                Click to toggle allergens on or off.
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_ALLERGENS.map((allergen) => {
                  const isSelected = selectedAllergens.includes(allergen);
                  const isAiDetected = aiDetectedAllergens.includes(allergen);
                  return (
                    <button
                      key={allergen}
                      type="button"
                      onClick={() => toggleAllergen(allergen)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                        isSelected
                          ? isAiDetected
                            ? "bg-purple-500 text-white border-purple-500 shadow-sm shadow-purple-200"
                            : "bg-red-500 text-white border-red-500 shadow-sm shadow-red-200"
                          : "bg-white text-slate-500 border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                      }`}
                    >
                      <span className="text-sm">{ALLERGEN_EMOJIS[allergen] || "\u26a0\ufe0f"}</span>
                      {allergen}
                      {isSelected && isAiDetected && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              {aiDetectedAllergens.length > 0 && (
                <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                  <span className="inline-block w-3 h-3 rounded-full bg-purple-500" />
                  AI-detected
                  <span className="inline-block w-3 h-3 rounded-full bg-red-500 ml-2" />
                  Manually selected
                </div>
              )}
            </div>

            {/* Action buttons - desktop */}
            <div className="hidden sm:flex gap-3 pb-6">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 bg-amber-500 text-white px-8 py-3 rounded-xl hover:bg-amber-600 transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-amber-200"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  isEdit ? "Update Dish" : "Save Dish"
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="px-6 py-3 rounded-xl text-sm font-medium text-slate-500 hover:bg-stone-100 transition-all"
              >
                Cancel
              </button>
            </div>

            {/* Mobile sticky save */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 p-4 sm:hidden z-20">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-amber-500 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 shadow-sm shadow-amber-200"
              >
                {saving ? "Saving..." : isEdit ? "Update Dish" : "Save Dish"}
              </button>
            </div>
          </form>

          {/* Preview sidebar */}
          <div className="lg:col-span-2 hidden lg:block">
            <div className="sticky top-6">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Card Preview
              </h3>
              <DishCard dish={previewDish} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
