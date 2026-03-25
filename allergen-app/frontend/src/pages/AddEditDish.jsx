import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getMe,
  getAdminDishes,
  createDish,
  updateDish,
  detectAllergens,
} from "../api";

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

export default function AddEditDish() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
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
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">
          {isEdit ? "Edit Dish" : "Add New Dish"}
        </h1>
        <button
          onClick={() => navigate("/admin")}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          Back to Dashboard
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price (£)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ingredients (one per line)
          </label>
          <textarea
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            rows={6}
            placeholder={"200g chicken breast\n1 tsp curry paste\n100ml coconut milk"}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          <button
            type="button"
            onClick={handleDetect}
            disabled={detecting || !ingredients.trim()}
            className="mt-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm disabled:opacity-50"
          >
            {detecting ? "Detecting..." : "Detect Allergens"}
          </button>
        </div>

        {detectionResult && (
          <div className="bg-gray-50 rounded-lg p-4">
            {detectionResult.allergens?.length > 0 ? (
              <p className="text-green-700 text-sm mb-2">
                Detected: {detectionResult.allergens.join(", ")}
              </p>
            ) : (
              <p className="text-gray-500 text-sm mb-2">
                No allergens detected.
              </p>
            )}
            {detectionResult.ai_used && (
              <p className="text-amber-600 text-sm">
                Some allergens were detected using AI.
              </p>
            )}
            {detectionResult.ai_warnings?.map((w, i) => (
              <p key={i} className="text-red-600 text-sm">
                {w}
              </p>
            ))}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Allergens (click to add/remove)
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_ALLERGENS.map((allergen) => (
              <button
                key={allergen}
                type="button"
                onClick={() => toggleAllergen(allergen)}
                className={`px-3 py-1 rounded-full text-sm border transition ${
                  selectedAllergens.includes(allergen)
                    ? "bg-red-100 border-red-300 text-red-700"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {allergen}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : isEdit ? "Update Dish" : "Save Dish"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
