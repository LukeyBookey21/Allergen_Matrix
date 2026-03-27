import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getPreOrderForAmendment, submitPreOrderAmendment, getMenuBySlug, getDishOptions } from "../api";

const UK_ALLERGENS = [
  "Celery", "Cereals containing gluten", "Crustaceans", "Eggs", "Fish",
  "Lupin", "Milk", "Molluscs", "Mustard", "Nuts", "Peanuts",
  "Sesame", "Soya", "Sulphur dioxide",
];

const COURSE_LABELS = ["starter", "main", "dessert"];

export default function AmendPreOrder() {
  const { reference } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [preOrder, setPreOrder] = useState(null);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dinnerDishes, setDinnerDishes] = useState([]);
  const [dishOptionsCache, setDishOptionsCache] = useState({});
  const [specialNotes, setSpecialNotes] = useState("");

  // Group dinner dishes by category
  const dishesByCategory = useCallback(() => {
    const grouped = {};
    dinnerDishes.forEach((d) => {
      const cat = (d.category || "Uncategorised").toLowerCase();
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(d);
    });
    return grouped;
  }, [dinnerDishes]);

  const getCourseOptions = useCallback(
    (courseLabel) => {
      const cats = dishesByCategory();
      const matches = [];
      Object.entries(cats).forEach(([cat, dishes]) => {
        if (cat.includes(courseLabel) || (courseLabel === "main" && cat.includes("main"))) {
          matches.push(...dishes);
        }
      });
      if (matches.length === 0) {
        Object.entries(cats).forEach(([cat, dishes]) => {
          if (courseLabel === "starter" && (cat.includes("start") || cat.includes("appetiser") || cat.includes("appetizer") || cat.includes("small"))) {
            matches.push(...dishes);
          } else if (courseLabel === "main" && (cat.includes("main") || cat.includes("entree") || cat.includes("large"))) {
            matches.push(...dishes);
          } else if (courseLabel === "dessert" && (cat.includes("dessert") || cat.includes("sweet") || cat.includes("pudding"))) {
            matches.push(...dishes);
          }
        });
      }
      if (matches.length === 0) return dinnerDishes;
      return matches;
    },
    [dishesByCategory, dinnerDishes]
  );

  const fetchDishOptions = useCallback(
    async (dishId) => {
      if (!dishId || dishOptionsCache[dishId]) return;
      const opts = await getDishOptions(dishId);
      setDishOptionsCache((prev) => ({ ...prev, [dishId]: opts }));
    },
    [dishOptionsCache]
  );

  // Load pre-order and menu data
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [poData, dinnerData] = await Promise.all([
        getPreOrderForAmendment(reference, token),
        getMenuBySlug("dinner"),
      ]);

      if (poData.error) {
        setError(poData.error);
        setLoading(false);
        return;
      }

      setPreOrder(poData);
      setSpecialNotes(poData.special_notes || "");

      if (dinnerData) {
        const dishes = dinnerData.dishes || dinnerData || [];
        setDinnerDishes(dishes);
      }

      // Convert pre-order guests to editable state
      const editableGuests = (poData.guests || []).map((g) => ({
        name: g.name || "",
        allergens: g.allergens || [],
        dietary_notes: g.dietary_notes || "",
        courses: COURSE_LABELS.map((courseLabel) => {
          const existing = (g.courses || []).find((c) => c.course === courseLabel);
          if (existing && !existing.skipped && existing.dish_id) {
            return {
              course: courseLabel,
              menu_item_id: existing.dish_id,
              skipped: false,
              customisations: existing.customisations || {},
              notes: existing.notes || "",
            };
          }
          return {
            course: courseLabel,
            menu_item_id: null,
            skipped: true,
            customisations: {},
            notes: "",
          };
        }),
      }));

      setGuests(editableGuests);

      // Preload dish options for existing selections
      editableGuests.forEach((g) => {
        g.courses.forEach((c) => {
          if (c.menu_item_id) {
            getDishOptions(c.menu_item_id).then((opts) => {
              setDishOptionsCache((prev) => ({ ...prev, [c.menu_item_id]: opts }));
            });
          }
        });
      });

      setLoading(false);
    }
    load();
  }, [reference, token]);

  const updateGuest = (guestIdx, field, value) => {
    setGuests((prev) => {
      const copy = [...prev];
      copy[guestIdx] = { ...copy[guestIdx], [field]: value };
      return copy;
    });
  };

  const toggleAllergen = (guestIdx, allergen) => {
    const current = guests[guestIdx].allergens || [];
    const next = current.includes(allergen)
      ? current.filter((a) => a !== allergen)
      : [...current, allergen];
    updateGuest(guestIdx, "allergens", next);
  };

  const updateCourse = (guestIdx, courseIdx, dishId) => {
    const guest = guests[guestIdx];
    const courses = [...guest.courses];
    const dish = dinnerDishes.find((d) => d.id === Number(dishId));
    courses[courseIdx] = {
      ...courses[courseIdx],
      menu_item_id: dish ? dish.id : null,
      skipped: !dish,
      customisations: {},
      notes: "",
    };
    updateGuest(guestIdx, "courses", courses);
    if (dish) fetchDishOptions(dish.id);
  };

  const updateCourseCustomisation = (guestIdx, courseIdx, optionName, value) => {
    const guest = guests[guestIdx];
    const courses = [...guest.courses];
    courses[courseIdx] = {
      ...courses[courseIdx],
      customisations: { ...courses[courseIdx].customisations, [optionName]: value },
    };
    updateGuest(guestIdx, "courses", courses);
  };

  const updateCourseNotes = (guestIdx, courseIdx, notes) => {
    const guest = guests[guestIdx];
    const courses = [...guest.courses];
    courses[courseIdx] = { ...courses[courseIdx], notes };
    updateGuest(guestIdx, "courses", courses);
  };

  const getDishName = (dishId) => {
    const d = dinnerDishes.find((x) => x.id === dishId);
    return d ? d.name : "Unknown dish";
  };

  const getDishPrice = (dishId) => {
    const d = dinnerDishes.find((x) => x.id === dishId);
    return d ? Number(d.price || 0) : 0;
  };

  const calcTotal = () => {
    let total = 0;
    guests.forEach((g) => {
      g.courses.forEach((c) => {
        if (!c.skipped && c.menu_item_id) total += getDishPrice(c.menu_item_id);
      });
    });
    return total;
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const data = {
      special_notes: specialNotes,
      guests: guests.map((g) => ({
        name: g.name,
        allergens: g.allergens,
        dietary_notes: g.dietary_notes || "",
        courses: g.courses.map((c) => ({
          course: c.course,
          menu_item_id: c.menu_item_id,
          skipped: c.skipped,
          customisations: c.customisations,
          notes: c.notes || "",
        })),
      })),
    };
    const res = await submitPreOrderAmendment(reference, token, data);
    setSaving(false);
    if (res.error) {
      setError(res.error);
    } else {
      setSaved(true);
    }
  };

  // ========== RENDER ==========

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="bg-slate-800 text-white py-6 px-4 text-center">
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
            Curious Kitchen <span className="text-amber-400">&mdash;</span> Amend Pre-Order
          </h1>
        </header>
        <div className="max-w-2xl mx-auto mt-12 px-4 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-64 mx-auto mb-4"></div>
            <div className="h-4 bg-slate-200 rounded w-48 mx-auto"></div>
          </div>
          <p className="text-slate-500 mt-4">Loading your pre-order...</p>
        </div>
      </div>
    );
  }

  if (error && !preOrder) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="bg-slate-800 text-white py-6 px-4 text-center">
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
            Curious Kitchen <span className="text-amber-400">&mdash;</span> Amend Pre-Order
          </h1>
        </header>
        <div className="max-w-lg mx-auto mt-12 px-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Unable to Load Pre-Order</h2>
            <p className="text-slate-600">{error}</p>
            <a
              href="/menu"
              className="inline-block mt-6 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Back to Menu
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="bg-slate-800 text-white py-6 px-4 text-center">
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
            Curious Kitchen <span className="text-amber-400">&mdash;</span> Amend Pre-Order
          </h1>
        </header>
        <div className="max-w-lg mx-auto mt-12 px-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Changes Saved!</h2>
            <p className="text-slate-600 mb-4">
              Your pre-order <strong className="text-amber-700">{preOrder.reference}</strong> has been updated successfully.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              An updated confirmation email has been sent to <strong>{preOrder.email}</strong>.
            </p>
            <a
              href="/menu"
              className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Back to Menu
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-slate-800 text-white py-6 px-4 text-center">
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
          Curious Kitchen <span className="text-amber-400">&mdash;</span> Amend Pre-Order
        </h1>
        <p className="text-amber-400 font-mono text-lg mt-1">{preOrder.reference}</p>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Booking info summary */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-3">Booking Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-500 block">Date</span>
              <span className="font-semibold text-slate-800">{preOrder.booking_date}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Time</span>
              <span className="font-semibold text-slate-800">{preOrder.booking_time}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Party Size</span>
              <span className="font-semibold text-slate-800">{preOrder.party_size} guests</span>
            </div>
            <div>
              <span className="text-slate-500 block">Contact</span>
              <span className="font-semibold text-slate-800">{preOrder.contact_name}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            To change booking date, time, or party size, please contact us directly.
          </p>
        </div>

        {/* Special notes */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Special Occasion / Notes
          </label>
          <textarea
            value={specialNotes}
            onChange={(e) => setSpecialNotes(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
            rows={2}
            placeholder="Birthday, anniversary, dietary requirements..."
            maxLength={1000}
          />
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Guest editors */}
        <div className="space-y-6">
          {guests.map((guest, guestIdx) => (
            <div key={guestIdx} className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold text-sm">
                  {guestIdx + 1}
                </div>
                <input
                  type="text"
                  value={guest.name}
                  onChange={(e) => updateGuest(guestIdx, "name", e.target.value)}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder={`Guest ${guestIdx + 1}`}
                  maxLength={100}
                />
              </div>

              {/* Allergens */}
              <div className="mb-4">
                <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Allergens</p>
                <div className="flex flex-wrap gap-1.5">
                  {UK_ALLERGENS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAllergen(guestIdx, a)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        guest.allergens.includes(a)
                          ? "bg-red-100 border-red-300 text-red-700 font-semibold"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Courses */}
              <div className="space-y-4">
                {COURSE_LABELS.map((courseLabel, courseIdx) => {
                  const course = guest.courses[courseIdx];
                  const options = getCourseOptions(courseLabel);
                  const selectedDish = course.menu_item_id
                    ? dinnerDishes.find((d) => d.id === course.menu_item_id)
                    : null;
                  const dishOpts = course.menu_item_id ? dishOptionsCache[course.menu_item_id] || [] : [];

                  return (
                    <div key={courseLabel} className="border border-slate-100 rounded-xl p-3">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        {courseLabel}
                      </label>
                      <select
                        value={course.menu_item_id || ""}
                        onChange={(e) => updateCourse(guestIdx, courseIdx, e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                      >
                        <option value="">-- Skip this course --</option>
                        {options.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} -- £{Number(d.price).toFixed(2)}
                            {d.allergens && d.allergens.length > 0
                              ? ` [${d.allergens.map((a) => a.name).join(", ")}]`
                              : ""}
                          </option>
                        ))}
                      </select>

                      {/* Dish options / customisations */}
                      {selectedDish && dishOpts.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {dishOpts.map((group) => (
                            <div key={group.group} className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 w-16 shrink-0">{group.group}:</span>
                              <select
                                value={course.customisations[group.group] || ""}
                                onChange={(e) =>
                                  updateCourseCustomisation(guestIdx, courseIdx, group.group, e.target.value)
                                }
                                className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                              >
                                <option value="">{group.is_required ? "Select..." : "None"}</option>
                                {group.options.map((opt) => (
                                  <option key={opt.id} value={opt.name}>
                                    {opt.name}
                                    {opt.price_modifier > 0 ? ` (+£${opt.price_modifier.toFixed(2)})` : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Course notes */}
                      {selectedDish && (
                        <input
                          type="text"
                          value={course.notes}
                          onChange={(e) => updateCourseNotes(guestIdx, courseIdx, e.target.value)}
                          className="w-full mt-2 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          placeholder="Special requests for this dish..."
                          maxLength={300}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Total and save */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-600 font-medium">Estimated Total</span>
            <span className="text-2xl font-bold text-slate-800">
              £{calcTotal().toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors text-lg"
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>

          <p className="text-xs text-slate-400 text-center mt-3">
            You can amend your order up to 24 hours before your booking.
          </p>
        </div>
      </div>
    </div>
  );
}
