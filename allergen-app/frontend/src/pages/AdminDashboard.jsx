import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getMe, getAdminDishes, getAdminMenus, deleteDish, toggleDish, toggleSpecial, logout, getAdminOrders, updateOrderStatus, getAdminPreOrders, updatePreOrderStatus, getAnalytics, getAllergyMatrix } from "../api";
import AllergenBadge from "../components/AllergenBadge";

export default function AdminDashboard() {
  const [dishes, setDishes] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrUrl, setQrUrl] = useState(null);
  const [search, setSearch] = useState("");
  const [menuFilter, setMenuFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("menu");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [orderStatusError, setOrderStatusError] = useState("");
  const [preOrders, setPreOrders] = useState([]);
  const [preOrdersLoading, setPreOrdersLoading] = useState(false);
  const [expandedPreOrder, setExpandedPreOrder] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [userRole, setUserRole] = useState("chef");
  const [showAllergenRef, setShowAllergenRef] = useState(false);
  const [matrixAllergens, setMatrixAllergens] = useState([]);
  const [matrixMenuSlug, setMatrixMenuSlug] = useState("");
  const [matrixResult, setMatrixResult] = useState(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const ordersInterval = useRef(null);
  const previousOrderCount = useRef(0);
  const preOrdersInterval = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function init() {
      const me = await getMe();
      if (!me) return;
      setUserRole(me.role || "chef");
      if (me.role === "foh") setActiveTab("orders");
      const [dishData, menuData] = await Promise.all([
        getAdminDishes(),
        getAdminMenus().catch(() => []),
      ]);
      setDishes(dishData || []);
      setMenus(menuData || []);
      setLoading(false);
    }
    init();
  }, []);

  async function handleDelete(id) {
    if (!confirm("Delete this dish?")) return;
    await deleteDish(id);
    setDishes((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleToggle(id) {
    const result = await toggleDish(id);
    setDishes((prev) =>
      prev.map((d) => (d.id === id ? { ...d, active: result.active } : d))
    );
  }

  async function handleToggleSpecial(id) {
    const result = await toggleSpecial(id);
    setDishes((prev) =>
      prev.map((d) => (d.id === id ? { ...d, is_special: result.is_special } : d))
    );
  }

  async function handleLogout() {
    await logout();
    navigate("/admin/login");
  }

  const loadOrders = useCallback(async () => {
    try {
      const data = await getAdminOrders(orderStatusFilter);
      if (data) {
        if (data.length > previousOrderCount.current && previousOrderCount.current > 0) {
          // New order arrived - flash the tab
          document.title = "New Order! - Curious Kitchen Admin";
          setTimeout(() => { document.title = "Curious Kitchen - Admin"; }, 3000);
        }
        previousOrderCount.current = data.length;
        setOrders(data);
      }
    } catch {
      // silently fail
    }
  }, [orderStatusFilter]);

  // Auto-refresh orders every 30 seconds when on orders tab
  useEffect(() => {
    if (activeTab === "orders") {
      setOrdersLoading(true);
      loadOrders().finally(() => setOrdersLoading(false));
      ordersInterval.current = setInterval(loadOrders, 30000);
      return () => clearInterval(ordersInterval.current);
    }
    return () => clearInterval(ordersInterval.current);
  }, [activeTab, loadOrders]);

  const loadPreOrders = useCallback(async () => {
    try {
      const data = await getAdminPreOrders();
      if (data) setPreOrders(data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (activeTab === "preorders") {
      setPreOrdersLoading(true);
      loadPreOrders().finally(() => setPreOrdersLoading(false));
      preOrdersInterval.current = setInterval(loadPreOrders, 30000);
      return () => clearInterval(preOrdersInterval.current);
    }
    return () => clearInterval(preOrdersInterval.current);
  }, [activeTab, loadPreOrders]);

  useEffect(() => {
    if (activeTab === "analytics") {
      setAnalyticsLoading(true);
      getAnalytics().then(data => {
        setAnalytics(data);
        setAnalyticsLoading(false);
      });
    }
  }, [activeTab]);

  async function handleUpdatePreOrderStatus(id, status) {
    try {
      const result = await updatePreOrderStatus(id, status);
      if (result) {
        setPreOrders(prev => prev.map(po => po.id === id ? { ...po, status } : po));
      }
    } catch {
      // silently fail
    }
  }

  async function handleUpdateOrderStatus(orderId, status) {
    setOrderStatusError("");
    try {
      const result = await updateOrderStatus(orderId, status);
      if (!result) {
        setOrderStatusError(`Failed to update order #${orderId} status.`);
        return;
      }
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch {
      setOrderStatusError(`Failed to update order #${orderId} status. Please try again.`);
    }
  }

  const STATUS_COLORS = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    preparing: "bg-orange-100 text-orange-800",
    ready: "bg-green-100 text-green-800",
    served: "bg-gray-100 text-gray-500",
    cancelled: "bg-red-100 text-red-700",
  };

  const STATUS_OPTIONS = ["pending", "confirmed", "preparing", "ready", "served", "cancelled"];

  const totalDishes = dishes.length;
  const activeDishes = dishes.filter((d) => d.active).length;
  const specialsCount = dishes.filter((d) => d.is_special).length;

  // Get unique categories from current filtered dishes
  const allCategories = [...new Set(dishes.map((d) => d.category).filter(Boolean))];

  const filteredDishes = dishes.filter((d) => {
    // Chef: hide drinks menu items
    if (userRole === "chef" && d.menu_slug === "drinks") return false;
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchesMenu = menuFilter === "All" || d.menu_slug === menuFilter || d.menu_id === menuFilter;
    const matchesCategory = categoryFilter === "All" || d.category === categoryFilter;
    return matchesSearch && matchesMenu && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-slate-400 text-sm font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-slate-800 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl sm:text-2xl font-bold">
              Curious Kitchen
            </h1>
            <span className="hidden sm:inline text-slate-500 font-light">|</span>
            <span className="hidden sm:inline text-slate-400 text-sm font-medium">
              Admin
            </span>
            <p className="text-slate-400 text-xs">
              {userRole === "foh" ? "Front of House" : userRole === "manager" ? "Manager" : "Kitchen"} Dashboard
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-700"
            >
              View Menu
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Main tabs: Menu Items | Orders */}
        <div className="flex gap-1 mb-6 bg-stone-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("menu")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "menu"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Menu Items
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === "orders"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Orders
            {orders.filter(o => o.status === "pending").length > 0 && (
              <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {orders.filter(o => o.status === "pending").length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("preorders")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === "preorders"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Pre-Orders
            {preOrders.filter(po => po.status === "pending").length > 0 && (
              <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {preOrders.filter(po => po.status === "pending").length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "matrix"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Allergy Matrix
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "analytics"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Analytics
          </button>
        </div>

        {activeTab === "menu" && (
        <>
        {userRole === "foh" && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-6">
            <button onClick={() => setShowAllergenRef(!showAllergenRef)} className="flex items-center justify-between w-full">
              <h3 className="font-semibold text-slate-700 text-sm">Quick Allergen Reference</h3>
              <span className="text-slate-400 text-sm">{showAllergenRef ? "Hide" : "Show"}</span>
            </button>
            {showAllergenRef && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3">
                {[
                  {name: "Celery", emoji: "\u{1F33F}"}, {name: "Gluten", emoji: "\u{1F33E}"},
                  {name: "Crustaceans", emoji: "\u{1F990}"}, {name: "Eggs", emoji: "\u{1F95A}"},
                  {name: "Fish", emoji: "\u{1F41F}"}, {name: "Lupin", emoji: "\u{1F338}"},
                  {name: "Milk", emoji: "\u{1F95B}"}, {name: "Molluscs", emoji: "\u{1F991}"},
                  {name: "Mustard", emoji: "\u{1F7E1}"}, {name: "Peanuts", emoji: "\u{1F95C}"},
                  {name: "Sesame", emoji: "\u{1F330}"}, {name: "Soybeans", emoji: "\u{1FAD8}"},
                  {name: "Sulphites", emoji: "\u{1F377}"}, {name: "Tree Nuts", emoji: "\u{1F333}"},
                ].map(a => (
                  <div key={a.name} className="bg-stone-50 rounded-lg p-2 text-center">
                    <span className="text-lg">{a.emoji}</span>
                    <p className="text-xs font-medium text-slate-600 mt-1">{a.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-stone-100 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Dishes</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalDishes}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-stone-100 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Active</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{activeDishes}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-stone-100 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Specials</p>
            <p className="text-2xl font-bold text-amber-500 mt-1">{specialsCount}</p>
          </div>
        </div>

        {/* Menu selector tabs */}
        {menus.length > 0 && (
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            <button
              onClick={() => setMenuFilter("All")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                menuFilter === "All"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-500 hover:bg-stone-100"
              }`}
            >
              All Menus
            </button>
            {menus.filter((menu) => !(userRole === "chef" && (menu.slug || menu.id) === "drinks")).map((menu) => (
              <button
                key={menu.slug || menu.id}
                onClick={() => setMenuFilter(menu.slug || menu.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  menuFilter === (menu.slug || menu.id)
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-500 hover:bg-stone-100"
                }`}
              >
                {menu.name}
              </button>
            ))}
          </div>
        )}

        {/* Category sub-tabs */}
        {allCategories.length > 0 && (
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            <button
              onClick={() => setCategoryFilter("All")}
              className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                categoryFilter === "All"
                  ? "bg-amber-500 text-white"
                  : "text-slate-400 hover:bg-stone-100"
              }`}
            >
              All Categories
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  categoryFilter === cat
                    ? "bg-amber-500 text-white"
                    : "text-slate-400 hover:bg-stone-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* FOH Drinks quick filter */}
        {userRole === "foh" && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setCategoryFilter(categoryFilter === "Drinks" ? "All" : "Drinks")}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                categoryFilter === "Drinks"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 3a1 1 0 011-1h.01a1 1 0 010 2H7a1 1 0 01-1-1zm2 3a1 1 0 00-2 0v1a2 2 0 00-2 2v1a2 2 0 00-2 2v.683a3.7 3.7 0 011.055 2.633 1 1 0 001.89.465 3.7 3.7 0 012.11-.648h.09a3.7 3.7 0 012.11.648 1 1 0 001.89-.465A3.7 3.7 0 0114 14.683V14a2 2 0 00-2-2v-1a2 2 0 00-2-2V6z" clipRule="evenodd" />
              </svg>
              Drinks
            </button>
          </div>
        )}

        {/* Action bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              placeholder="Search dishes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white"
            />
          </div>
          {userRole === "foh" ? (
          <Link
            to="/admin/dishes/new?menu=drinks"
            className="inline-flex items-center justify-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-xl hover:bg-amber-600 transition-all duration-200 text-sm font-medium shadow-sm shadow-amber-200 whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Drink
          </Link>
          ) : (
          <Link
            to={`/admin/dishes/new${menuFilter !== "All" ? `?menu=${menuFilter}` : ""}`}
            className="inline-flex items-center justify-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-xl hover:bg-amber-600 transition-all duration-200 text-sm font-medium shadow-sm shadow-amber-200 whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Dish
          </Link>
          )}
        </div>

        {/* QR Code section */}
        {qrUrl ? (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <img src={qrUrl} alt="QR Code" className="w-40 h-40 rounded-xl border border-stone-100" />
              <div className="text-center sm:text-left">
                <h3 className="font-semibold text-lg text-slate-800 mb-1">Menu QR Code</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Print and display this at your venue so customers can scan to view the menu.
                </p>
                <div className="flex gap-2 justify-center sm:justify-start">
                  <a
                    href={qrUrl}
                    download="menu-qr-code.png"
                    className="inline-flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl hover:bg-slate-700 transition text-sm font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Download for your venue
                  </a>
                  <button
                    onClick={() => setQrUrl(null)}
                    className="text-slate-400 hover:text-slate-600 px-3 py-2 rounded-xl hover:bg-stone-50 text-sm transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setQrUrl("/admin/qr-code?" + Date.now())}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" />
              <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM7 11a1 1 0 100-2H4a1 1 0 100 2h3zM17 13a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zM16 17a1 1 0 100-2h-3a1 1 0 100 2h3z" />
            </svg>
            Show QR Code
          </button>
        )}

        {/* Manage Menus section */}
        {menus.length > 0 && (
          <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-4 mb-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Menus</h3>
            <div className="flex flex-wrap gap-2">
              {menus.map((menu) => {
                const menuDishCount = dishes.filter(
                  (d) => d.menu_slug === (menu.slug || menu.id) || d.menu_id === (menu.slug || menu.id)
                ).length;
                return (
                  <div
                    key={menu.slug || menu.id}
                    className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-lg text-sm"
                  >
                    <span className="font-medium text-slate-700">{menu.name}</span>
                    <span className="text-xs text-slate-400">
                      {menuDishCount} {menuDishCount === 1 ? "dish" : "dishes"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dishes */}
        {filteredDishes.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-stone-100 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-slate-500 font-medium">No dishes found</p>
            <p className="text-slate-400 text-sm mt-1">
              {dishes.length === 0
                ? "Add your first dish to get started."
                : "Try adjusting your search or filters."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Menu</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Price</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Special</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Allergens</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {filteredDishes.map((dish) => {
                    const dishMenu = menus.find(
                      (m) => (m.slug || m.id) === (dish.menu_slug || dish.menu_id)
                    );
                    return (
                      <tr
                        key={dish.id}
                        className={`group hover:bg-stone-50 transition-colors ${!dish.active ? "opacity-50" : ""}`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-800">{dish.name}</span>
                            {dish.dietary_labels && dish.dietary_labels.split(",").map(label => label.trim()).filter(Boolean).map(label => (
                              <span
                                key={label}
                                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold flex-shrink-0 ${
                                  label === "VG" ? "bg-green-600 text-white" :
                                  label === "V" ? "bg-green-500 text-white" :
                                  label === "GF" ? "bg-amber-500 text-white" :
                                  "bg-slate-400 text-white"
                                }`}
                                title={label === "V" ? "Vegetarian" : label === "VG" ? "Vegan" : label === "GF" ? "Gluten Free" : label}
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-slate-400">{dishMenu?.name || "---"}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-slate-500">{dish.category || "---"}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-medium text-slate-700 tabular-nums">
                            {Number(dish.price).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => handleToggle(dish.id)}
                            className={`toggle-switch ${dish.active ? "bg-green-500" : "bg-stone-300"}`}
                          >
                            <span
                              className={`toggle-dot ${dish.active ? "translate-x-5" : "translate-x-1"}`}
                            />
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => handleToggleSpecial(dish.id)}
                            className={`transition-all duration-200 ${
                              dish.is_special
                                ? "text-amber-500 hover:text-amber-600"
                                : "text-stone-300 hover:text-amber-400"
                            }`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </button>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {(dish.allergens || []).map((a) => (
                              <AllergenBadge key={a.id} allergen={a} small />
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {(userRole === "foh" ? dish.menu_slug === "drinks" : true) && (
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              to={`/admin/dishes/${dish.id}/edit`}
                              className="text-slate-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50 transition-all"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </Link>
                            {userRole !== "foh" && (
                            <button
                              onClick={() => handleDelete(dish.id)}
                              className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                              title="Delete"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                            )}
                          </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden grid gap-3">
              {filteredDishes.map((dish) => {
                const dishMenu = menus.find(
                  (m) => (m.slug || m.id) === (dish.menu_slug || dish.menu_id)
                );
                return (
                  <div
                    key={dish.id}
                    className={`bg-white rounded-xl border border-stone-100 shadow-sm p-4 ${
                      !dish.active ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-slate-800">{dish.name}</h3>
                          {dish.dietary_labels && dish.dietary_labels.split(",").map(label => label.trim()).filter(Boolean).map(label => (
                            <span
                              key={label}
                              className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold flex-shrink-0 ${
                                label === "VG" ? "bg-green-600 text-white" :
                                label === "V" ? "bg-green-500 text-white" :
                                label === "GF" ? "bg-amber-500 text-white" :
                                "bg-slate-400 text-white"
                              }`}
                              title={label === "V" ? "Vegetarian" : label === "VG" ? "Vegan" : label === "GF" ? "Gluten Free" : label}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {dishMenu && (
                            <>
                              <span className="text-xs text-slate-400">{dishMenu.name}</span>
                              <span className="text-slate-300">-</span>
                            </>
                          )}
                          <span className="text-sm text-slate-500">{dish.category || "---"}</span>
                          <span className="text-slate-300">-</span>
                          <span className="text-sm font-medium text-amber-600">{Number(dish.price).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleSpecial(dish.id)}
                          className={`${dish.is_special ? "text-amber-500" : "text-stone-300"}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {(dish.allergens || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(dish.allergens || []).map((a) => (
                          <AllergenBadge key={a.id} allergen={a} small />
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                      <button
                        onClick={() => handleToggle(dish.id)}
                        className={`toggle-switch ${dish.active ? "bg-green-500" : "bg-stone-300"}`}
                      >
                        <span className={`toggle-dot ${dish.active ? "translate-x-5" : "translate-x-1"}`} />
                      </button>
                      {(userRole === "foh" ? dish.menu_slug === "drinks" : true) && (
                      <div className="flex gap-2">
                        <Link
                          to={`/admin/dishes/${dish.id}/edit`}
                          className="text-sm text-slate-500 hover:text-amber-600 font-medium transition-colors"
                        >
                          Edit
                        </Link>
                        {userRole !== "foh" && (
                        <button
                          onClick={() => handleDelete(dish.id)}
                          className="text-sm text-slate-400 hover:text-red-600 font-medium transition-colors"
                        >
                          Delete
                        </button>
                        )}
                      </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        </>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div>
            {/* Status filter */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
              <button
                onClick={() => setOrderStatusFilter("")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  orderStatusFilter === ""
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-500 hover:bg-stone-100"
                }`}
              >
                All Orders
              </button>
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  onClick={() => setOrderStatusFilter(status)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 capitalize ${
                    orderStatusFilter === status
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-500 hover:bg-stone-100"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Refresh button */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-400">
                {orders.length} {orders.length === 1 ? "order" : "orders"}
              </p>
              <button
                onClick={() => { setOrdersLoading(true); loadOrders().finally(() => setOrdersLoading(false)); }}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${ordersLoading ? "animate-spin" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Refresh
              </button>
            </div>

            {orderStatusError && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium border border-red-100 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V7a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {orderStatusError}
                <button onClick={() => setOrderStatusError("")} className="ml-auto text-red-400 hover:text-red-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}

            {ordersLoading && orders.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-slate-400 text-sm font-medium">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16 animate-fade-in">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-stone-100 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-slate-500 font-medium">No orders found</p>
                <p className="text-slate-400 text-sm mt-1">Orders will appear here when customers place them.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {orders.map((order) => (
                  <div key={order.id} className={`bg-white rounded-xl border shadow-sm p-5 ${order.status === "pending" ? "border-amber-300 ring-1 ring-amber-100" : "border-stone-100"}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        {order.status === "pending" && (
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                          </span>
                        )}
                        {order.table_number && (
                          <span className="inline-flex items-center justify-center bg-slate-800 text-white text-sm font-bold rounded-lg px-3 py-1">
                            T{order.table_number}
                          </span>
                        )}
                        <h3 className="font-bold text-slate-800">Order #{order.id}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-500"}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        {order.customer_name && (
                          <span>{order.customer_name}</span>
                        )}
                        {order.created_at && (
                          <span className="text-slate-400">
                            {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Order items */}
                    {Array.isArray(order.items) && order.items.length > 0 && (
                      <div className="bg-stone-50 rounded-lg p-3 mb-3">
                        <div className="space-y-1.5">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-xs font-medium w-5">{item.quantity}x</span>
                                <span className="text-slate-700">{item.name || item.menu_item_name || `Item #${item.menu_item_id}`}</span>
                              </div>
                              {item.notes && (
                                <span className="text-xs text-slate-400 italic truncate max-w-[150px]">{item.notes}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Order notes */}
                    {order.notes && (
                      <p className="text-sm text-slate-500 italic mb-3">Note: {order.notes}</p>
                    )}

                    {/* Status update */}
                    <div className="flex items-center gap-2 pt-3 border-t border-stone-100">
                      <label className="text-xs text-slate-400 font-medium">Update status:</label>
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                        className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-transparent bg-white capitalize"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s} className="capitalize">{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Allergy Matrix Tab */}
        {activeTab === "matrix" && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Allergy Matrix</h2>
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-6">
              <p className="text-sm font-medium text-slate-600 mb-3">Select customer's allergens:</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 mb-4">
                {[
                  {name: "Celery", emoji: "\u{1F33F}"}, {name: "Gluten", emoji: "\u{1F33E}"},
                  {name: "Crustaceans", emoji: "\u{1F990}"}, {name: "Eggs", emoji: "\u{1F95A}"},
                  {name: "Fish", emoji: "\u{1F41F}"}, {name: "Lupin", emoji: "\u{1F338}"},
                  {name: "Milk", emoji: "\u{1F95B}"}, {name: "Molluscs", emoji: "\u{1F991}"},
                  {name: "Mustard", emoji: "\u{1F7E1}"}, {name: "Peanuts", emoji: "\u{1F95C}"},
                  {name: "Sesame", emoji: "\u{1F330}"}, {name: "Soybeans", emoji: "\u{1FAD8}"},
                  {name: "Sulphites", emoji: "\u{1F377}"}, {name: "Tree Nuts", emoji: "\u{1F333}"},
                ].map(a => (
                  <button
                    key={a.name}
                    onClick={() => setMatrixAllergens(prev => prev.includes(a.name) ? prev.filter(x => x !== a.name) : [...prev, a.name])}
                    className={`rounded-lg p-2 text-center text-xs font-medium transition-all duration-200 border ${
                      matrixAllergens.includes(a.name)
                        ? "bg-red-50 border-red-300 text-red-700 ring-1 ring-red-200"
                        : "bg-stone-50 border-stone-200 text-slate-600 hover:bg-stone-100"
                    }`}
                  >
                    <span className="text-lg block">{a.emoji}</span>
                    {a.name}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-500">Filter by menu:</label>
                  <select
                    value={matrixMenuSlug}
                    onChange={(e) => setMatrixMenuSlug(e.target.value)}
                    className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                  >
                    <option value="">All</option>
                    {menus.map(m => (
                      <option key={m.slug || m.id} value={m.slug || m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={async () => {
                    if (matrixAllergens.length === 0) return;
                    setMatrixLoading(true);
                    const result = await getAllergyMatrix(matrixAllergens, matrixMenuSlug);
                    setMatrixResult(result);
                    setMatrixLoading(false);
                  }}
                  disabled={matrixAllergens.length === 0 || matrixLoading}
                  className="inline-flex items-center justify-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-xl hover:bg-amber-600 transition-all duration-200 text-sm font-medium shadow-sm shadow-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {matrixLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Checking...
                    </>
                  ) : "Check Matrix"}
                </button>
              </div>
            </div>

            {matrixResult && (
              <div className="space-y-6">
                {/* Safe Dishes */}
                {matrixResult.safe && matrixResult.safe.length > 0 && (
                  <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                    <div className="border-l-4 border-green-500 p-5">
                      <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                        <span className="text-green-500">&#10003;</span> Safe Dishes ({matrixResult.safe.length})
                      </h3>
                      <div className="space-y-2">
                        {matrixResult.safe.map((dish, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <span className="text-slate-400">&#9500;&#9472;&#9472;</span>
                            <span className="font-medium text-slate-700">{dish.name}</span>
                            {dish.price != null && (
                              <span className="text-slate-400">&mdash; &pound;{Number(dish.price).toFixed(2)}</span>
                            )}
                            {dish.menu_name && (
                              <span className="text-xs text-slate-400">({dish.menu_name})</span>
                            )}
                            {dish.dietary_labels && dish.dietary_labels.split(",").map(l => l.trim()).filter(Boolean).map(l => (
                              <span key={l} className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold flex-shrink-0 ${
                                l === "VG" ? "bg-green-600 text-white" :
                                l === "V" ? "bg-green-500 text-white" :
                                l === "GF" ? "bg-amber-500 text-white" :
                                "bg-slate-400 text-white"
                              }`}>{l}</span>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Unsafe Dishes */}
                {matrixResult.unsafe && matrixResult.unsafe.length > 0 && (
                  <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                    <div className="border-l-4 border-red-500 p-5">
                      <h3 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                        <span className="text-red-500">&#10007;</span> Unsafe Dishes ({matrixResult.unsafe.length})
                      </h3>
                      <div className="space-y-2">
                        {matrixResult.unsafe.map((dish, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm flex-wrap">
                            <span className="text-slate-400">&#9500;&#9472;&#9472;</span>
                            <span className="font-medium text-slate-700">{dish.name}</span>
                            {dish.price != null && (
                              <span className="text-slate-400">&mdash; &pound;{Number(dish.price).toFixed(2)}</span>
                            )}
                            {dish.conflicting_allergens && dish.conflicting_allergens.length > 0 && (
                              <span className="text-xs text-red-500 font-medium">
                                contains {dish.conflicting_allergens.join(", ")}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {(!matrixResult.safe || matrixResult.safe.length === 0) && (!matrixResult.unsafe || matrixResult.unsafe.length === 0) && (
                  <div className="text-center py-8 text-slate-400 text-sm">No results returned. Try different allergens or menu filter.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div>
            {analyticsLoading ? (
              <div className="text-center py-16">
                <div className="inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-slate-400 text-sm font-medium">Loading analytics...</p>
              </div>
            ) : !analytics ? (
              <div className="text-center py-16 animate-fade-in">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-stone-100 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-slate-500 font-medium">Analytics unavailable</p>
                <p className="text-slate-400 text-sm mt-1">Could not load analytics data. Try again later.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                    <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest mb-1">Today's Orders</p>
                    <p className="text-3xl font-bold text-blue-700">{analytics.orders?.today ?? 0}</p>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-5">
                    <p className="text-[10px] font-semibold text-green-400 uppercase tracking-widest mb-1">Today's Revenue</p>
                    <p className="text-3xl font-bold text-green-700">&pound;{analytics.revenue?.today ?? "0.00"}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
                    <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest mb-1">Avg Order Value</p>
                    <p className="text-3xl font-bold text-emerald-700">&pound;{analytics.revenue?.average_order ?? "0.00"}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
                    <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest mb-1">Upcoming Pre-Orders</p>
                    <p className="text-3xl font-bold text-amber-700">{analytics.pre_orders?.upcoming ?? 0}</p>
                  </div>
                </div>

                {/* Top Dishes + Allergen Trends */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top 10 Dishes */}
                  <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Top 10 Dishes</h3>
                    {analytics.top_dishes && analytics.top_dishes.length > 0 ? (
                      <div className="space-y-2.5">
                        {analytics.top_dishes.slice(0, 10).map((dish, idx) => {
                          const maxCount = analytics.top_dishes[0]?.count || 1;
                          const barWidth = Math.max((dish.count / maxCount) * 100, 8);
                          return (
                            <div key={idx}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-slate-700 font-medium">{idx + 1}. {dish.name}</span>
                                <span className="text-slate-400 text-xs">{dish.count} orders</span>
                              </div>
                              <div className="w-full bg-stone-100 rounded-full h-2">
                                <div
                                  className="bg-amber-400 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">No dish data available yet.</p>
                    )}
                  </div>

                  {/* Allergen Trends */}
                  <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Allergen Trends</h3>
                    {analytics.allergen_trends && analytics.allergen_trends.length > 0 ? (
                      <div className="space-y-2.5">
                        {analytics.allergen_trends.map((allergen, idx) => {
                          const maxCount = analytics.allergen_trends[0]?.count || 1;
                          const barWidth = Math.max((allergen.count / maxCount) * 100, 8);
                          return (
                            <div key={idx}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-slate-700 font-medium">{allergen.name}</span>
                                <span className="text-slate-400 text-xs">{allergen.count} dishes ordered</span>
                              </div>
                              <div className="w-full bg-stone-100 rounded-full h-2">
                                <div
                                  className="bg-red-300 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">No allergen data available yet.</p>
                    )}
                  </div>
                </div>

                {/* Order Status Breakdown */}
                <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Order Status Breakdown</h3>
                  {analytics.orders?.by_status ? (
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(analytics.orders.by_status).map(([status, count]) => (
                        <span
                          key={status}
                          className={`px-3 py-1.5 rounded-full text-sm font-semibold capitalize ${STATUS_COLORS[status] || "bg-gray-100 text-gray-500"}`}
                        >
                          {count} {status}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No status data available.</p>
                  )}
                </div>

                {/* All Time Stats */}
                <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">All Time Stats</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Total Orders</p>
                      <p className="text-xl font-bold text-slate-800">{analytics.orders?.total ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Total Revenue</p>
                      <p className="text-xl font-bold text-slate-800">&pound;{analytics.revenue?.total ?? "0.00"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Menu Items</p>
                      <p className="text-xl font-bold text-slate-800">
                        {analytics.menu_items?.active ?? 0} <span className="text-sm font-normal text-slate-400">/ {analytics.menu_items?.total ?? 0} total</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Total Pre-Orders</p>
                      <p className="text-xl font-bold text-slate-800">{analytics.pre_orders?.total ?? 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pre-Orders Tab */}
        {activeTab === "preorders" && (
          <div>
            {/* Refresh button */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-400">
                {preOrders.length} {preOrders.length === 1 ? "pre-order" : "pre-orders"}
              </p>
              <button
                onClick={() => { setPreOrdersLoading(true); loadPreOrders().finally(() => setPreOrdersLoading(false)); }}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${preOrdersLoading ? "animate-spin" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Refresh
              </button>
            </div>

            {preOrdersLoading && preOrders.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-slate-400 text-sm font-medium">Loading pre-orders...</p>
              </div>
            ) : preOrders.length === 0 ? (
              <div className="text-center py-16 animate-fade-in">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-stone-100 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-slate-500 font-medium">No pre-orders found</p>
                <p className="text-slate-400 text-sm mt-1">Pre-orders will appear here when customers submit them.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {preOrders.map((po) => (
                  <div key={po.id} className="bg-white rounded-xl border border-stone-100 shadow-sm p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-slate-800">{po.reference || `PO-${po.id}`}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[po.status] || "bg-gray-100 text-gray-500"}`}>
                          {po.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        {po.booking_date && (
                          <span>{po.booking_date}</span>
                        )}
                        {po.booking_time && (
                          <span>{po.booking_time}</span>
                        )}
                        {po.party_size && (
                          <span className="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                            </svg>
                            {po.party_size} guests
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contact info */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mb-3">
                      {po.contact_name && (
                        <span className="font-medium text-slate-700">{po.contact_name}</span>
                      )}
                      {po.contact_email && (
                        <span className="text-slate-400">{po.contact_email}</span>
                      )}
                    </div>

                    {/* Download links */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <a
                        href={`/admin/pre-orders/${po.id}/kitchen-sheet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-stone-50 hover:bg-stone-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Kitchen Sheet
                      </a>
                      <a
                        href={`/admin/pre-orders/${po.id}/placecards`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-stone-50 hover:bg-stone-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Place Cards
                      </a>
                    </div>

                    {/* Expandable guest details */}
                    <button
                      onClick={() => setExpandedPreOrder(expandedPreOrder === po.id ? null : po.id)}
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium mb-2 transition-colors"
                    >
                      {expandedPreOrder === po.id ? "Hide guest details" : "Show guest details"}
                    </button>

                    {expandedPreOrder === po.id && Array.isArray(po.guests) && (
                      <div className="bg-stone-50 rounded-lg p-3 mb-3">
                        <div className="space-y-3">
                          {po.guests.map((guest, gIdx) => (
                            <div key={gIdx} className="border-b border-stone-200 pb-2 last:border-0 last:pb-0">
                              <p className="text-sm font-medium text-slate-700 mb-1">
                                {guest.name || `Guest ${gIdx + 1}`}
                                {guest.allergens && guest.allergens.length > 0 && (
                                  <span className="ml-2 text-xs text-red-500 font-normal">
                                    Allergens: {Array.isArray(guest.allergens) ? guest.allergens.join(", ") : guest.allergens}
                                  </span>
                                )}
                              </p>
                              {Array.isArray(guest.courses) && guest.courses.map((course, cIdx) => (
                                <div key={cIdx} className="flex items-center gap-2 text-sm text-slate-600 ml-2">
                                  <span className="text-xs text-slate-400 font-medium capitalize">{course.course || course.label}:</span>
                                  <span>{course.dish_name || course.name || "---"}</span>
                                  {course.notes && <span className="text-xs text-slate-400 italic">({course.notes})</span>}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Status update */}
                    <div className="flex items-center gap-2 pt-3 border-t border-stone-100">
                      <label className="text-xs text-slate-400 font-medium">Update status:</label>
                      <select
                        value={po.status}
                        onChange={(e) => handleUpdatePreOrderStatus(po.id, e.target.value)}
                        className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-transparent bg-white capitalize"
                      >
                        {["pending", "confirmed", "amended", "cancelled"].map((s) => (
                          <option key={s} value={s} className="capitalize">{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
