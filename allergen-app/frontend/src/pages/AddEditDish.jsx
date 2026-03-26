import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getMe,
  getAdminDishes,
  createDish,
  updateDish,
  detectAllergens,
} from "../api";
import AllergenBadge from "../components/AllergenBadge";

const ALL_ALLERGENS = [
  "Celery", "Gluten", "Crustaceans", "Eggs", "Fish", "Lupin",
  "Milk", "Molluscs", "Mustard", "Peanuts", "Sesame", "Soybeans",
  "Sulphites", "Tree Nuts",
];

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
          setDescription(dish.description);
          setPrice(String(dish.price));
          setCategory(dish.category || "Mains");
          setIsSpecial(dish.is_special || false);
          setIngredients(dish.ingredients.map((i) => i.raw_text).join("\n"));
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
      setSelectedAllergens(result.allergens || []);
    } catch {
      setDetectionResult({ allergens: [], ai_warnings: ["Detection failed"] });
    }
    setDetecting(false);
  }

  function toggleAllergen(name) {
    setSelectedAllergens((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
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

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-slate-800 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">
              {isEdit ? "Edit Dish" : "New Dish"}
            </h1>
            <p className="text-slate-400 text-xs">Curious Kitchen Admin</p>
          </div>
          <button
            onClick={() => navigate("/admin")}
            className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic info */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Dish Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                  placeholder="e.g. Pan-Seared Sea Bass"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                  placeholder="Short description of the dish..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Price (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition bg-white"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsSpecial(!isSpecial)}
                  className={`toggle-switch ${isSpecial ? "bg-amber-500" : "bg-slate-200"}`}
                >
                  <span className={`toggle-dot ${isSpecial ? "translate-x-5" : "translate-x-1"}`} />
                </button>
                <div>
                  <span className="text-sm font-medium text-slate-700">Mark as Today's Special</span>
                  <p className="text-xs text-slate-400">Highlighted at the top of the customer menu</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Ingredients
            </h2>
            <textarea
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              rows={6}
              placeholder={"200g chicken breast\n1 tsp curry paste\n100ml coconut milk\n2 tbsp sesame oil"}
              className="w-full border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition font-mono text-sm"
            />
            <p className="text-xs text-slate-400 mt-1.5 mb-3">
              Enter one ingredient per line. Quantities are automatically stripped during detection.
            </p>
            <button
              type="button"
              onClick={handleDetect}
              disabled={detecting || !ingredients.trim()}
              className="bg-slate-800 text-white px-5 py-2 rounded-xl hover:bg-slate-700 transition text-sm font-semibold disabled:opacity-40 flex items-center gap-2"
            >
              {detecting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Detect Allergens
                </>
              )}
            </button>

            {detectionResult && (
              <div className="mt-4 rounded-xl bg-stone-50 border border-stone-200 p-4 animate-fade-in">
                {detectionResult.allergens?.length > 0 ? (
                  <div className="flex items-center gap-2 text-green-700 text-sm mb-2 font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Detected: {detectionResult.allergens.join(", ")}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm mb-2">No allergens detected.</p>
                )}
                {detectionResult.ai_used && (
                  <p className="text-amber-600 text-sm flex items-center gap-1">
                    <span>⚠️</span> Some allergens were detected using AI
                  </p>
                )}
                {detectionResult.ai_warnings?.map((w, i) => (
                  <p key={i} className="text-red-500 text-sm">{w}</p>
                ))}
              </div>
            )}
          </div>

          {/* Allergens */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Allergens
            </h2>
            <p className="text-xs text-slate-400 mb-3">Click to add or remove allergens manually.</p>
            <div className="flex flex-wrap gap-2">
              {ALL_ALLERGENS.map((allergen) => (
                <button
                  key={allergen}
                  type="button"
                  onClick={() => toggleAllergen(allergen)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    selectedAllergens.includes(allergen)
                      ? "bg-red-500 text-white shadow-sm shadow-red-200"
                      : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                  }`}
                >
                  {allergen}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {name && (
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Preview
              </h2>
              <div className="border border-stone-200 rounded-xl p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg text-slate-800">{name}</h3>
                  <span className="text-lg font-bold text-amber-600">
                    £{(parseFloat(price) || 0).toFixed(2)}
                  </span>
                </div>
                {description && <p className="text-slate-500 text-sm mb-3">{description}</p>}
                <div className="flex flex-wrap gap-1.5 pt-3 border-t border-stone-100">
                  {selectedAllergens.map((a) => (
                    <AllergenBadge
                      key={a}
                      allergen={{ name: a, icon_emoji: "" }}
                      small
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Save buttons */}
          <div className="sticky bottom-0 bg-stone-50/95 backdrop-blur-sm py-4 border-t border-stone-200 -mx-4 px-4 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-semibold hover:bg-amber-600 transition-all duration-200 disabled:opacity-50 shadow-sm text-sm"
            >
              {saving ? "Saving..." : isEdit ? "Update Dish" : "Save Dish"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="bg-white text-slate-600 py-3 px-6 rounded-xl border border-stone-200 font-medium hover:bg-stone-50 transition text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
