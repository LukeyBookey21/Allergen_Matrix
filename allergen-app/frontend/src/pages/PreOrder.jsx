import { useState, useEffect, useCallback } from "react";
import { getMenuBySlug, getAllergens, getDishOptions, submitPreOrder } from "../api";

const UK_ALLERGENS = [
  "Celery", "Cereals containing gluten", "Crustaceans", "Eggs", "Fish",
  "Lupin", "Milk", "Molluscs", "Mustard", "Nuts", "Peanuts",
  "Sesame", "Soya", "Sulphur dioxide",
];

const COURSE_LABELS = ["starter", "main", "dessert"];

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function generateTimeSlots() {
  const slots = [];
  for (let h = 12; h <= 21; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 21 || true) slots.push(`${String(h).padStart(2, "0")}:30`);
    if (h === 21) break;
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function StepIndicator({ step }) {
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              s === step
                ? "bg-amber-500 scale-125 ring-2 ring-amber-300"
                : s < step
                ? "bg-amber-600"
                : "bg-slate-300"
            }`}
          />
          {s < 4 && (
            <div className={`w-8 h-0.5 ${s < step ? "bg-amber-500" : "bg-slate-300"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function createEmptyGuest(index) {
  return {
    name: `Guest ${index + 1}`,
    allergens: [],
    courses: COURSE_LABELS.map((c) => ({
      course: c,
      menu_item_id: null,
      skipped: true,
      customisations: {},
      notes: "",
    })),
  };
}

export default function PreOrder() {
  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState({
    contact_name: "",
    email: "",
    phone: "",
    booking_date: "",
    booking_time: "19:00",
    party_size: 8,
  });
  const [guests, setGuests] = useState(() => Array.from({ length: 8 }, (_, i) => createEmptyGuest(i)));
  const [currentGuestIdx, setCurrentGuestIdx] = useState(0);
  const [dinnerDishes, setDinnerDishes] = useState([]);
  const [drinksDishes, setDrinksDishes] = useState([]);
  const [tableDrinks, setTableDrinks] = useState([]);
  const [specialOccasion, setSpecialOccasion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [allergenList, setAllergenList] = useState([]);
  const [dishOptionsCache, setDishOptionsCache] = useState({});
  const [errors, setErrors] = useState({});
  const [guestWarning, setGuestWarning] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    async function init() {
      const [dinnerData, drinksData, allergenData] = await Promise.all([
        getMenuBySlug("dinner"),
        getMenuBySlug("drinks"),
        getAllergens(),
      ]);
      if (dinnerData) {
        const dishes = dinnerData.dishes || dinnerData || [];
        setDinnerDishes(dishes);
      }
      if (drinksData) {
        const drinks = drinksData.dishes || drinksData || [];
        setDrinksDishes(drinks);
        setTableDrinks(drinks.filter((d) => {
          const cat = (d.category || "").toLowerCase();
          return cat === "bottles";
        }).map((d) => ({ ...d, qty: 0 })));
      }
      if (allergenData) setAllergenList(allergenData);
    }
    init();
  }, []);

  // Resize guests when party size changes
  useEffect(() => {
    const size = booking.party_size;
    setGuests((prev) => {
      if (prev.length === size) return prev;
      if (size > prev.length) {
        return [...prev, ...Array.from({ length: size - prev.length }, (_, i) => createEmptyGuest(prev.length + i))];
      }
      return prev.slice(0, size);
    });
    setCurrentGuestIdx((prev) => Math.min(prev, size - 1));
  }, [booking.party_size]);

  // Group dinner dishes by category for course dropdowns
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
      // If no category match, try broader matching
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
      // Fallback: if still empty, show all dinner dishes for this course
      if (matches.length === 0) return dinnerDishes;
      return matches;
    },
    [dishesByCategory, dinnerDishes]
  );

  // Fetch dish options
  const fetchDishOptions = useCallback(
    async (dishId) => {
      if (!dishId || dishOptionsCache[dishId]) return;
      const opts = await getDishOptions(dishId);
      setDishOptionsCache((prev) => ({ ...prev, [dishId]: opts }));
    },
    [dishOptionsCache]
  );

  // ----- Step 1: Booking -----
  const validateStep1 = () => {
    const errs = {};
    if (!booking.contact_name.trim()) errs.contact_name = "Name is required";
    if (!booking.email.trim() || !/\S+@\S+\.\S+/.test(booking.email)) errs.email = "Valid email required";
    if (!booking.booking_date) errs.booking_date = "Date is required";
    if (!booking.booking_time) errs.booking_time = "Time is required";
    if (booking.party_size < 8 || booking.party_size > 50) errs.party_size = "Party size must be 8-50";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ----- Step 2: Guest Orders -----
  const currentGuest = guests[currentGuestIdx] || createEmptyGuest(currentGuestIdx);

  const updateGuest = (field, value) => {
    setGuests((prev) => {
      const copy = [...prev];
      copy[currentGuestIdx] = { ...copy[currentGuestIdx], [field]: value };
      return copy;
    });
  };

  const toggleAllergen = (allergen) => {
    const current = currentGuest.allergens || [];
    const next = current.includes(allergen)
      ? current.filter((a) => a !== allergen)
      : [...current, allergen];
    updateGuest("allergens", next);
  };

  const updateCourse = (courseIdx, dishId) => {
    const courses = [...currentGuest.courses];
    const dish = dinnerDishes.find((d) => d.id === Number(dishId));
    courses[courseIdx] = {
      ...courses[courseIdx],
      menu_item_id: dish ? dish.id : null,
      skipped: !dish,
      customisations: {},
      notes: "",
    };
    updateGuest("courses", courses);
    if (dish) fetchDishOptions(dish.id);
  };

  const updateCourseCustomisation = (courseIdx, optionName, value) => {
    const courses = [...currentGuest.courses];
    courses[courseIdx] = {
      ...courses[courseIdx],
      customisations: { ...courses[courseIdx].customisations, [optionName]: value },
    };
    updateGuest("courses", courses);
  };

  const updateCourseNotes = (courseIdx, notes) => {
    const courses = [...currentGuest.courses];
    courses[courseIdx] = { ...courses[courseIdx], notes };
    updateGuest("courses", courses);
  };

  const handleGuestNext = () => {
    if (currentGuestIdx < guests.length - 1) {
      setCurrentGuestIdx((p) => p + 1);
    } else {
      // Check if any guest has all courses skipped
      const missing = guests.some((g) => g.courses.every((c) => c.skipped));
      if (missing && !guestWarning) {
        setGuestWarning(true);
        return;
      }
      setGuestWarning(false);
      setStep(3);
    }
  };

  // ----- Step 3: Drinks -----
  const updateDrinkQty = (idx, delta) => {
    setTableDrinks((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], qty: Math.max(0, copy[idx].qty + delta) };
      return copy;
    });
  };

  // ----- Step 4: Submit -----
  const getDishName = (dishId) => {
    const d = dinnerDishes.find((x) => x.id === dishId);
    return d ? d.name : "Unknown dish";
  };

  const getDishPrice = (dishId) => {
    const d = dinnerDishes.find((x) => x.id === dishId);
    return d ? Number(d.price || 0) : 0;
  };

  const getDrinkPrice = (drink) => Number(drink.price || 0);

  const calcTotal = () => {
    let total = 0;
    guests.forEach((g) => {
      g.courses.forEach((c) => {
        if (!c.skipped && c.menu_item_id) total += getDishPrice(c.menu_item_id);
      });
    });
    tableDrinks.forEach((d) => {
      total += getDrinkPrice(d) * d.qty;
    });
    return total;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const data = {
      contact_name: booking.contact_name,
      email: booking.email,
      phone: booking.phone,
      party_size: booking.party_size,
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      special_notes: specialOccasion,
      guests: guests.map((g) => ({
        name: g.name,
        allergens: g.allergens,
        dietary_notes: "",
        courses: g.courses.map((c) => ({
          course: c.course,
          menu_item_id: c.menu_item_id,
          skipped: c.skipped,
          customisations: c.customisations,
          notes: c.notes || "",
        })),
      })),
      drinks: tableDrinks.filter((d) => d.qty > 0).map((d) => ({
        menu_item_id: d.id,
        name: d.name,
        quantity: d.qty,
        price: d.price,
      })),
    };
    const res = await submitPreOrder(data);
    setResult(res);
    setSubmitting(false);
  };

  // ========== RENDER ==========

  if (result && !result.error) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="bg-slate-800 text-white py-6 px-4 text-center">
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
            Curious Kitchen <span className="text-amber-400">&mdash;</span> Group Pre-Order
          </h1>
        </header>
        <div className="max-w-lg mx-auto mt-12 px-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Pre-Order Confirmed!</h2>
            <p className="text-slate-600 mb-4">Your group booking has been submitted successfully.</p>
            {result.reference && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-slate-500 mb-1">Your reference number</p>
                <p className="text-2xl font-bold text-amber-700 tracking-wider">{result.reference}</p>
              </div>
            )}
            <p className="text-sm text-slate-500 mb-6">
              A confirmation email has been sent to <strong>{booking.email}</strong>.
              <br />Free changes up to 24 hours before your booking.
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
          Curious Kitchen <span className="text-amber-400">&mdash;</span> Group Pre-Order
        </h1>
        <p className="text-slate-300 text-sm mt-1">For parties of 8 or more</p>
      </header>

      <StepIndicator step={step} />

      <div className="max-w-2xl mx-auto px-4 pb-12">
        {/* ========== STEP 1: BOOKING DETAILS ========== */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Booking Details</h2>

            <div className="space-y-4">
              {/* Contact Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={booking.contact_name}
                  onChange={(e) => setBooking((b) => ({ ...b, contact_name: e.target.value }))}
                  className={`w-full border rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    errors.contact_name ? "border-red-400" : "border-slate-200"
                  }`}
                  placeholder="Your full name"
                />
                {errors.contact_name && <p className="text-red-500 text-xs mt-1">{errors.contact_name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={booking.email}
                  onChange={(e) => setBooking((b) => ({ ...b, email: e.target.value }))}
                  className={`w-full border rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    errors.email ? "border-red-400" : "border-slate-200"
                  }`}
                  placeholder="you@email.com"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone (optional)</label>
                <input
                  type="tel"
                  value={booking.phone}
                  onChange={(e) => setBooking((b) => ({ ...b, phone: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="07..."
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Booking Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={booking.booking_date}
                  min={getTomorrow()}
                  onChange={(e) => setBooking((b) => ({ ...b, booking_date: e.target.value }))}
                  className={`w-full border rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    errors.booking_date ? "border-red-400" : "border-slate-200"
                  }`}
                />
                {errors.booking_date && <p className="text-red-500 text-xs mt-1">{errors.booking_date}</p>}
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Booking Time <span className="text-red-500">*</span>
                </label>
                <select
                  value={booking.booking_time}
                  onChange={(e) => setBooking((b) => ({ ...b, booking_time: e.target.value }))}
                  className={`w-full border rounded-xl px-4 py-3 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    errors.booking_time ? "border-red-400" : "border-slate-200"
                  }`}
                >
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {errors.booking_time && <p className="text-red-500 text-xs mt-1">{errors.booking_time}</p>}
              </div>

              {/* Party Size */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Party Size <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={8}
                  max={50}
                  value={booking.party_size}
                  onChange={(e) => {
                    const v = Math.max(8, Math.min(50, Number(e.target.value) || 8));
                    setBooking((b) => ({ ...b, party_size: v }));
                  }}
                  className={`w-full border rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    errors.party_size ? "border-red-400" : "border-slate-200"
                  }`}
                />
                {errors.party_size && <p className="text-red-500 text-xs mt-1">{errors.party_size}</p>}
              </div>
            </div>

            <button
              onClick={() => {
                if (validateStep1()) {
                  setErrors({});
                  setStep(2);
                }
              }}
              className="mt-8 w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* ========== STEP 2: GUEST ORDERS ========== */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                Guest {currentGuestIdx + 1} of {guests.length}
              </h2>
              <span className="text-sm text-slate-400">
                {currentGuestIdx + 1}/{guests.length}
              </span>
            </div>

            {/* Guest Name */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-1">Guest Name</label>
              <input
                type="text"
                value={currentGuest.name}
                onChange={(e) => updateGuest("name", e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder={`Guest ${currentGuestIdx + 1}`}
              />
            </div>

            {/* Allergen Toggles */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Allergens</label>
              <div className="flex flex-wrap gap-2">
                {UK_ALLERGENS.map((a) => {
                  const active = (currentGuest.allergens || []).includes(a);
                  return (
                    <button
                      key={a}
                      onClick={() => toggleAllergen(a)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        active
                          ? "bg-red-100 border-red-400 text-red-700"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Course Selectors */}
            {COURSE_LABELS.map((courseLabel, courseIdx) => {
              const courseData = currentGuest.courses[courseIdx];
              const options = getCourseOptions(courseLabel);
              const selectedDishId = courseData?.menu_item_id;
              const dishOpts = selectedDishId ? dishOptionsCache[selectedDishId] || [] : [];

              return (
                <div key={courseLabel} className="mb-5">
                  <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">
                    {courseLabel}
                  </label>
                  <select
                    value={selectedDishId || ""}
                    onChange={(e) => updateCourse(courseIdx, e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">No {courseLabel}</option>
                    {options.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.price ? `- \u00A3${Number(d.price).toFixed(2)}` : ""}
                      </option>
                    ))}
                  </select>

                  {/* Dish Options */}
                  {dishOpts.length > 0 && (
                    <div className="mt-2 ml-2 space-y-2">
                      {dishOpts.map((opt) => (
                        <div key={opt.group}>
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            {opt.group}
                          </label>
                          <select
                            value={courseData?.customisations?.[opt.group] || ""}
                            onChange={(e) => updateCourseCustomisation(courseIdx, opt.group, e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                          >
                            <option value="">None</option>
                            {(opt.options || []).map((o) => (
                              <option key={o.id} value={o.name}>
                                {o.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Notes for this course */}
                  {selectedDishId && (
                    <input
                      type="text"
                      placeholder="Special notes for this dish (optional)"
                      value={courseData?.notes || ""}
                      onChange={(e) => updateCourseNotes(courseIdx, e.target.value)}
                      className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  )}
                </div>
              );
            })}

            {/* Guest warning */}
            {guestWarning && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-4">
                <p className="text-sm text-amber-800">
                  Some guests have no courses selected. Press continue again to proceed anyway, or go back and add selections.
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-6">
              {currentGuestIdx > 0 ? (
                <button
                  onClick={() => {
                    setCurrentGuestIdx((p) => p - 1);
                    setGuestWarning(false);
                  }}
                  className="flex-1 border border-slate-300 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Previous Guest
                </button>
              ) : (
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-slate-300 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleGuestNext}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {currentGuestIdx < guests.length - 1 ? "Next Guest" : "Continue"}
              </button>
            </div>
          </div>
        )}

        {/* ========== STEP 3: TABLE DRINKS ========== */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Pre-order drinks?</h2>
            <p className="text-sm text-slate-500 mb-6">
              Optional &mdash; add bottles for the table and they will be chilled and ready.
            </p>

            {tableDrinks.length === 0 && (
              <p className="text-slate-400 text-sm italic mb-6">No wines or champagne currently on the drinks menu.</p>
            )}

            <div className="space-y-3 mb-6">
              {tableDrinks.map((drink, idx) => (
                <div
                  key={drink.id}
                  className="flex items-center justify-between border border-slate-200 rounded-xl px-4 py-3"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-medium text-slate-800 text-sm truncate">{drink.name}</p>
                    {drink.price != null && Number(drink.price) > 0 && (
                      <p className="text-xs text-slate-500">&pound;{Number(drink.price).toFixed(2)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateDrinkQty(idx, -1)}
                      className="w-8 h-8 rounded-full border border-slate-300 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors text-lg font-bold"
                    >
                      &minus;
                    </button>
                    <span className="w-8 text-center font-semibold text-slate-800">{drink.qty}</span>
                    <button
                      onClick={() => updateDrinkQty(idx, 1)}
                      className="w-8 h-8 rounded-full border border-amber-400 text-amber-600 flex items-center justify-center hover:bg-amber-50 transition-colors text-lg font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Special Occasion */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Special occasion? (optional)
              </label>
              <input
                type="text"
                value={specialOccasion}
                onChange={(e) => setSpecialOccasion(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="e.g. Birthday, Anniversary, Retirement..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCurrentGuestIdx(guests.length - 1);
                  setStep(2);
                }}
                className="flex-1 border border-slate-300 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => {
                  setTableDrinks((prev) => prev.map((d) => ({ ...d, qty: 0 })));
                  setStep(4);
                }}
                className="flex-1 border border-slate-300 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ========== STEP 4: REVIEW & CONFIRM ========== */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Booking Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Review Your Pre-Order</h2>
              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                <span className="text-slate-500">Name</span>
                <span className="text-slate-800 font-medium">{booking.contact_name}</span>
                <span className="text-slate-500">Email</span>
                <span className="text-slate-800 font-medium">{booking.email}</span>
                {booking.phone && (
                  <>
                    <span className="text-slate-500">Phone</span>
                    <span className="text-slate-800 font-medium">{booking.phone}</span>
                  </>
                )}
                <span className="text-slate-500">Date</span>
                <span className="text-slate-800 font-medium">{booking.booking_date}</span>
                <span className="text-slate-500">Time</span>
                <span className="text-slate-800 font-medium">{booking.booking_time}</span>
                <span className="text-slate-500">Party Size</span>
                <span className="text-slate-800 font-medium">{booking.party_size} guests</span>
              </div>
              {specialOccasion && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
                  Special occasion: {specialOccasion}
                </div>
              )}
            </div>

            {/* Guest-by-guest summary */}
            {guests.map((guest, gIdx) => {
              const activeCourses = guest.courses.filter((c) => !c.skipped && c.menu_item_id);
              return (
                <div key={gIdx} className="bg-white rounded-2xl shadow p-5">
                  <h3 className="font-semibold text-slate-800 mb-2">
                    {guest.name || `Guest ${gIdx + 1}`}
                    {guest.allergens.length > 0 && (
                      <span className="ml-2 text-xs text-red-500 font-normal">
                        Allergens: {guest.allergens.join(", ")}
                      </span>
                    )}
                  </h3>
                  {activeCourses.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No courses selected</p>
                  ) : (
                    <ul className="space-y-1">
                      {activeCourses.map((c) => {
                        const customKeys = Object.entries(c.customisations || {}).filter(
                          ([, v]) => v
                        );
                        return (
                          <li key={c.course} className="text-sm">
                            <span className="capitalize text-slate-500">{c.course}:</span>{" "}
                            <span className="text-slate-800 font-medium">{getDishName(c.menu_item_id)}</span>
                            <span className="text-slate-400 ml-1">
                              &pound;{getDishPrice(c.menu_item_id).toFixed(2)}
                            </span>
                            {customKeys.length > 0 && (
                              <span className="text-xs text-slate-400 ml-1">
                                ({customKeys.map(([k, v]) => `${k}: ${v}`).join(", ")})
                              </span>
                            )}
                            {c.notes && (
                              <span className="text-xs text-slate-400 ml-1 italic">
                                &mdash; {c.notes}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}

            {/* Drinks summary */}
            {tableDrinks.some((d) => d.qty > 0) && (
              <div className="bg-white rounded-2xl shadow p-5">
                <h3 className="font-semibold text-slate-800 mb-2">Table Drinks</h3>
                <ul className="space-y-1">
                  {tableDrinks
                    .filter((d) => d.qty > 0)
                    .map((d) => (
                      <li key={d.id} className="text-sm text-slate-700">
                        {d.name} x{d.qty}{" "}
                        <span className="text-slate-400">
                          &pound;{(getDrinkPrice(d) * d.qty).toFixed(2)}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* Total & Confirm */}
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-bold text-slate-800">Estimated Total</span>
                <span className="text-2xl font-bold text-amber-600">
                  &pound;{calcTotal().toFixed(2)}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 text-sm text-slate-600">
                <p className="font-medium text-slate-700 mb-1">Payment: Pay on the day</p>
                <p>Free changes up to 24 hours before your booking.</p>
              </div>

              {result?.error && (
                <div className="bg-red-50 border border-red-300 rounded-xl p-4 mb-4">
                  <p className="text-sm text-red-700">{result.error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 border border-slate-300 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting...
                    </span>
                  ) : (
                    "Confirm Pre-Order"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
