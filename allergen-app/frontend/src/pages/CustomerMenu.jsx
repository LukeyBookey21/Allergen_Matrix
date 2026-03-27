import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getMenus, getMenuBySlug, getAllergens, submitOrder, getPairings } from "../api";
import DishRow from "../components/DishRow";
import AllergenDrawer from "../components/AllergenDrawer";
import CartDrawer from "../components/CartDrawer";

const MENU_EMOJIS = {
  "dinner-menu": "\uD83C\uDF7D\uFE0F",
  "bar-lounge": "\uD83C\uDF78",
  "afternoon-tea": "\u2615",
  "sunday-lunch": "\uD83E\uDD69",
  "drinks": "\uD83C\uDF77",
};

function getMenuEmoji(slug) {
  return MENU_EMOJIS[slug] || "\uD83C\uDF7D\uFE0F";
}

export default function CustomerMenu() {
  const { menuSlug } = useParams();
  const navigate = useNavigate();
  const tabsRef = useRef(null);

  const [menus, setMenus] = useState([]);
  const [activeMenu, setActiveMenu] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [selectedAllergens, setSelectedAllergens] = useState([]);
  const [mode, setMode] = useState("warn");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(false);
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("ck-cart");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const trackingInterval = useRef(null);
  const [pairingsMap, setPairingsMap] = useState({});
  const [error, setError] = useState(null);
  const [dietaryFilters, setDietaryFilters] = useState([]);

  // Load menus list and allergens on mount
  useEffect(() => {
    async function init() {
      try {
        const [menuList, allergenData] = await Promise.all([
          getMenus().catch(() => []),
          getAllergens().catch(() => []),
        ]);
        setMenus(menuList || []);
        setAllergens(allergenData || []);

        // Pick initial menu
        const targetSlug = menuSlug || (menuList && menuList.length > 0 ? menuList[0].slug : null);
        if (targetSlug) {
          const menuData = await getMenuBySlug(targetSlug).catch(() => ({ dishes: [] }));
          if (!menuData) {
            setError("Failed to load menu. Please try again.");
            setLoading(false);
            return;
          }
          setActiveMenu(menuList.find((m) => m.slug === targetSlug) || { slug: targetSlug, name: targetSlug });
          const loadedDishes = menuData.dishes || menuData || [];
          setDishes(loadedDishes);
          fetchPairings(loadedDishes);
        }
        setError(null);
      } catch {
        setError("Failed to load menu. Please try again.");
      }
      setLoading(false);
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("ck-cart", JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Clean up tracking interval on unmount
  useEffect(() => {
    return () => {
      if (trackingInterval.current) clearInterval(trackingInterval.current);
    };
  }, []);

  // When menuSlug changes via navigation, load that menu
  useEffect(() => {
    if (!menuSlug || menus.length === 0) return;
    const menu = menus.find((m) => m.slug === menuSlug);
    if (menu && (!activeMenu || activeMenu.slug !== menuSlug)) {
      loadMenu(menu);
    }
  }, [menuSlug, menus]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMenu(menu) {
    setMenuLoading(true);
    setActiveMenu(menu);
    const menuData = await getMenuBySlug(menu.slug).catch(() => ({ dishes: [] }));
    const loadedDishes = menuData.dishes || menuData || [];
    setDishes(loadedDishes);
    setMenuLoading(false);
    fetchPairings(loadedDishes);
  }

  function handleMenuTab(menu) {
    navigate(`/menu/${menu.slug}`, { replace: true });
    loadMenu(menu);
  }

  function toggleAllergen(name) {
    setSelectedAllergens((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  }

  function clearAllergens() {
    setSelectedAllergens([]);
  }

  // Cart functions
  function addToCart(dish) {
    setCart(prev => {
      const existing = prev.find(item => item.dish.id === dish.id);
      if (existing) {
        return prev.map(item =>
          item.dish.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { dish, quantity: 1, notes: "" }];
    });
  }

  function updateCartQuantity(dishId, quantity) {
    if (quantity <= 0) {
      removeFromCart(dishId);
      return;
    }
    setCart(prev => prev.map(item =>
      item.dish.id === dishId ? { ...item, quantity } : item
    ));
  }

  function removeFromCart(dishId) {
    setCart(prev => prev.filter(item => item.dish.id !== dishId));
  }

  function updateCartItemNotes(dishId, notes) {
    setCart(prev => prev.map(item =>
      item.dish.id === dishId ? { ...item, notes } : item
    ));
  }

  async function handleCheckout(tableNumber, customerName, customerEmail, orderNotes) {
    const orderData = {
      table_number: tableNumber,
      customer_name: customerName,
      customer_email: customerEmail,
      notes: orderNotes,
      items: cart.map(item => ({
        menu_item_id: item.dish.id,
        quantity: item.quantity,
        notes: item.notes,
      })),
    };
    const result = await submitOrder(orderData);
    if (result.error) {
      throw new Error(result.error);
    }
    if (result.id) {
      setOrderPlaced({ ...result, tableNumber, items: cart });
      setCart([]);
      setCartOpen(false);
    }
  }

  async function startTracking(orderId) {
    setTrackingOrder(null);
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.ok) setTrackingOrder(await res.json());
      } catch {}
    };
    await fetchStatus();
    trackingInterval.current = setInterval(fetchStatus, 10000);
  }

  function stopTracking() {
    if (trackingInterval.current) {
      clearInterval(trackingInterval.current);
      trackingInterval.current = null;
    }
    setTrackingOrder(null);
  }

  // Fetch pairings when dishes change
  async function fetchPairings(dishList) {
    const drinkCategories = ["Wine", "Beer", "Cocktails", "Soft Drinks", "Hot Drinks"];
    const foodDishes = dishList.filter(d => !drinkCategories.includes(d.category));
    const pairingPromises = foodDishes.map(d =>
      getPairings(d.id).then(p => [d.id, p]).catch(() => [d.id, []])
    );
    const pairingResults = await Promise.all(pairingPromises);
    const newPairingsMap = {};
    for (const [id, pairings] of pairingResults) {
      if (pairings.length > 0) newPairingsMap[id] = pairings;
    }
    setPairingsMap(newPairingsMap);
  }

  // Filter dishes
  const filteredDishes = dishes.filter((dish) => {
    if (!dish.active && dish.active !== undefined) return false;
    if (mode === "hide") {
      const dishAllergenNames = dish.allergens ? dish.allergens.map((a) => a.name) : [];
      if (selectedAllergens.some((a) => dishAllergenNames.includes(a))) return false;
    }
    // dietary filter
    if (dietaryFilters.length > 0) {
      const dishLabels = (dish.dietary_labels || "").split(",").map(l => l.trim());
      if (!dietaryFilters.every(f => dishLabels.includes(f))) return false;
    }
    return true;
  });

  // Group by category
  const grouped = {};
  for (const dish of filteredDishes) {
    const cat = dish.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(dish);
  }
  const CATEGORY_ORDER = ["Starters", "Nibbles", "Sandwiches", "Scones", "Sweet Treats", "Light Bites", "Mains", "Sides", "Desserts", "Wine", "Beer", "Cocktails", "Soft Drinks", "Hot Drinks", "Other"];
  const orderedCategories = Object.keys(grouped).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const isAfternoonTea = activeMenu?.slug === "afternoon-tea";
  const isDrinks = activeMenu?.slug === "drinks";

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-slate-400 text-sm font-medium tracking-wide">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-amber-50/30 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
          <p className="text-slate-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
            className="bg-amber-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-amber-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50/30">
      {/* Elegant restaurant header */}
      <header className="bg-slate-800 text-white">
        <div className="max-w-3xl mx-auto px-4 pt-10 pb-6 text-center relative">
          {/* Dietary filter + Allergen filter buttons - top right */}
          <div className="absolute right-4 top-4 flex items-center gap-1.5">
            {["V", "VG", "GF"].map(label => (
              <button
                key={label}
                onClick={() => setDietaryFilters(prev =>
                  prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
                )}
                className={`w-7 h-7 rounded-full text-[10px] font-bold transition-all ${
                  dietaryFilters.includes(label)
                    ? label === "VG" ? "bg-green-600 text-white ring-2 ring-green-400" :
                      label === "V" ? "bg-green-500 text-white ring-2 ring-green-300" :
                      "bg-amber-500 text-white ring-2 ring-amber-300"
                    : "bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
                title={label === "V" ? "Vegetarian" : label === "VG" ? "Vegan" : "Gluten Free"}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs font-medium bg-slate-700/50 hover:bg-slate-700 px-3 py-1.5 rounded-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              Allergens
              {selectedAllergens.length > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {selectedAllergens.length}
                </span>
              )}
            </button>
          </div>

          {/* Decorative line */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-px bg-amber-500/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />
            <div className="w-12 h-px bg-amber-500/40" />
          </div>

          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-2">
            Curious Kitchen
          </h1>
          <p className="text-slate-400 text-xs tracking-[0.25em] uppercase font-medium">
            Thorpe Park Hotel &amp; Spa
          </p>

          {/* Decorative line */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="w-8 h-px bg-amber-500/40" />
            <div className="w-1 h-1 rounded-full bg-amber-500/60" />
            <div className="w-8 h-px bg-amber-500/40" />
          </div>
        </div>

        {/* Menu tabs */}
        {menus.length > 1 && (
          <div className="border-t border-slate-700/60">
            <div
              ref={tabsRef}
              className="max-w-3xl mx-auto px-2 flex gap-1 overflow-x-auto scrollbar-hide py-2"
            >
              {menus.map((menu) => (
                <button
                  key={menu.slug}
                  onClick={() => handleMenuTab(menu)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                    activeMenu?.slug === menu.slug
                      ? "bg-amber-500/20 text-amber-300"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                  }`}
                >
                  <span className="text-base">{getMenuEmoji(menu.slug)}</span>
                  {menu.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Menu description (e.g. afternoon tea pricing) */}
      {activeMenu?.description && (
        <p className="text-center text-sm text-slate-500 italic mt-2 max-w-md mx-auto">
          {activeMenu.description}
        </p>
      )}

      {/* Active allergens indicator bar */}
      {selectedAllergens.length > 0 && (
        <div className="bg-red-50 border-b border-red-100">
          <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-red-600 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Filtering: {selectedAllergens.join(", ")}
              <span className="text-red-400">({mode === "hide" ? "hiding" : "warning"})</span>
            </div>
            <button
              onClick={() => setDrawerOpen(true)}
              className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              Edit
            </button>
          </div>
        </div>
      )}

      {/* Menu content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Afternoon tea per-person price header */}
        {isAfternoonTea && activeMenu?.price_per_person && (
          <div className="text-center mb-8">
            <p className="text-sm text-slate-500 font-medium">
              <span className="text-amber-700 font-display text-lg font-semibold">
                £{Number(activeMenu.price_per_person).toFixed(2)}
              </span>{" "}
              per person
            </p>
          </div>
        )}

        {menuLoading ? (
          <div className="text-center py-16">
            <div className="inline-block w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-slate-400 text-sm">Loading...</p>
          </div>
        ) : filteredDishes.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <p className="text-slate-400 text-sm">
              {selectedAllergens.length > 0
                ? "No dishes match your allergen filters. Try adjusting your selections."
                : "No dishes available at the moment."}
            </p>
            {selectedAllergens.length > 0 && (
              <button
                onClick={() => {
                  clearAllergens();
                  setMode("warn");
                }}
                className="mt-3 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="stagger-children">
            {orderedCategories.map((category) => (
              <section key={category} className="mb-10">
                {/* Category heading */}
                <div className="flex items-center gap-4 mb-1">
                  <h2 className="font-display text-2xl font-semibold text-slate-800 flex-shrink-0">
                    {category}
                  </h2>
                  <div className="flex-1 h-px bg-stone-300/50" />
                </div>

                {/* Dishes */}
                <div className={isDrinks ? "divide-y divide-stone-200/60" : "divide-y divide-stone-200/60"}>
                  {grouped[category].map((dish) => (
                    <DishRow
                      key={dish.id}
                      dish={dish}
                      selectedAllergens={selectedAllergens}
                      mode={mode}
                      hidePrice={isAfternoonTea}
                      compact={isDrinks}
                      onAddToCart={addToCart}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/60 bg-white/60">
        <div className="max-w-3xl mx-auto px-4 py-8 text-center">
          <p className="text-[11px] text-slate-400 leading-relaxed max-w-md mx-auto mb-4">
            Please inform your server of any allergies or dietary requirements.
            Whilst we take every care, we cannot guarantee that any dish is
            completely free from allergens.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/pre-order" className="text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors">
              Group dining? Pre-order for 8+
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              to="/admin/login"
              className="text-[11px] text-slate-300 hover:text-slate-500 transition-colors font-medium"
            >
              Staff login
            </Link>
          </div>
        </div>
      </footer>

      {/* Allergen drawer */}
      <AllergenDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        allergens={allergens}
        selected={selectedAllergens}
        onToggle={toggleAllergen}
        onClear={clearAllergens}
        mode={mode}
        onModeChange={setMode}
      />

      {/* Cart drawer */}
      <CartDrawer
        items={cart}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeFromCart}
        onUpdateNotes={updateCartItemNotes}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
        isOpen={cartOpen}
        pairingsMap={pairingsMap}
        onAddToCart={addToCart}
      />

      {/* Floating cart button */}
      {cart.length > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-amber-500 text-white w-14 h-14 rounded-full shadow-lg hover:bg-amber-600 transition-all hover:scale-105 flex items-center justify-center"
        >
          <span className="text-xl">&#x1F6D2;</span>
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center">
            {cart.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
        </button>
      )}

      {/* Order confirmation overlay */}
      {orderPlaced && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center animate-fade-in">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Order Placed!</h2>
            <p className="text-slate-500 text-sm mb-1">Order #{orderPlaced.id}</p>
            {orderPlaced.tableNumber && (
              <p className="text-slate-500 text-sm mb-1">Table {orderPlaced.tableNumber}</p>
            )}
            {orderPlaced.items && orderPlaced.items.length > 0 && (
              <div className="text-left bg-stone-50 rounded-lg p-3 mb-3 mt-3">
                {orderPlaced.items.map((item) => (
                  <div key={item.dish.id} className="flex justify-between text-sm py-0.5">
                    <span className="text-slate-600">{item.quantity}x {item.dish.name}</span>
                    <span className="text-slate-500">£{(Number(item.dish.price) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-stone-200 mt-2 pt-2 flex justify-between font-semibold text-sm">
                  <span className="text-slate-700">Total</span>
                  <span className="text-slate-800">£{orderPlaced.items.reduce((sum, item) => sum + Number(item.dish.price) * item.quantity, 0).toFixed(2)}</span>
                </div>
              </div>
            )}
            <p className="text-slate-500 text-sm mb-4">Your server will be with you shortly.</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  startTracking(orderPlaced.id);
                  setOrderPlaced(null);
                }}
                className="bg-slate-800 text-white px-5 py-2 rounded-xl font-semibold hover:bg-slate-700 transition-colors text-sm"
              >
                Track Order
              </button>
              <button
                onClick={() => setOrderPlaced(null)}
                className="bg-amber-500 text-white px-5 py-2 rounded-xl font-semibold hover:bg-amber-600 transition-colors text-sm"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order tracking overlay */}
      {trackingOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center animate-fade-in">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Order #{trackingOrder.id}</h2>
            {trackingOrder.table_number && (
              <p className="text-slate-500 text-sm mb-3">Table {trackingOrder.table_number}</p>
            )}
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize mb-4 ${
              trackingOrder.status === "pending" ? "bg-yellow-100 text-yellow-800" :
              trackingOrder.status === "confirmed" ? "bg-blue-100 text-blue-800" :
              trackingOrder.status === "preparing" ? "bg-orange-100 text-orange-800" :
              trackingOrder.status === "ready" ? "bg-green-100 text-green-800" :
              trackingOrder.status === "served" ? "bg-gray-100 text-gray-500" :
              "bg-slate-100 text-slate-600"
            }`}>
              {trackingOrder.status}
            </span>
            {trackingOrder.items && trackingOrder.items.length > 0 && (
              <div className="text-left bg-stone-50 rounded-lg p-3 mb-4">
                {trackingOrder.items.map((item, idx) => (
                  <div key={idx} className="text-sm text-slate-600 py-0.5">
                    {item.quantity}x {item.menu_item_name || item.name || "Item"}
                  </div>
                ))}
              </div>
            )}
            <p className="text-sm mb-4 font-medium">
              {trackingOrder.status === "ready" ? (
                <span className="text-green-600">Your order is ready!</span>
              ) : trackingOrder.status === "served" ? (
                <span className="text-gray-500">Your order has been served.</span>
              ) : (
                <span className="text-slate-500">Your order is being prepared...</span>
              )}
            </p>
            <button
              onClick={stopTracking}
              className="bg-amber-500 text-white px-6 py-2 rounded-xl font-semibold hover:bg-amber-600 transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
