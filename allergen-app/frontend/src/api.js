const API_BASE = "";

async function apiFetch(url, options = {}) {
  const res = await fetch(API_BASE + url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (res.status === 401 && url !== "/admin/login" && url !== "/admin/me") {
    window.location.href = "/admin/login";
    return null;
  }
  return res;
}

export async function login(email, password) {
  try {
    const res = await apiFetch("/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!res) return { error: "Login failed" };
    return await res.json();
  } catch {
    return { error: "Network error" };
  }
}

export async function logout() {
  try {
    await apiFetch("/admin/logout");
  } catch {
    // silently fail
  }
}

export async function getMe() {
  try {
    const res = await apiFetch("/admin/me");
    return res?.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function getAdminDishes() {
  try {
    const res = await apiFetch("/admin/dishes");
    if (!res) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function getAdminMenus() {
  try {
    const res = await apiFetch("/admin/menus");
    if (!res) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createDish(data) {
  try {
    const res = await apiFetch("/admin/dishes", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateDish(id, data) {
  try {
    const res = await apiFetch(`/admin/dishes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (!res) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function deleteDish(id) {
  try {
    const res = await apiFetch(`/admin/dishes/${id}`, { method: "DELETE" });
    if (!res) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function toggleDish(id) {
  try {
    const res = await apiFetch(`/admin/dishes/${id}/toggle`, { method: "PATCH" });
    if (!res) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function toggleSpecial(id) {
  try {
    const res = await apiFetch(`/admin/dishes/${id}/toggle-special`, { method: "PATCH" });
    if (!res) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function detectAllergens(ingredients) {
  try {
    const res = await apiFetch("/admin/detect-allergens", {
      method: "POST",
      body: JSON.stringify({ ingredients }),
    });
    if (!res) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function overrideAllergens(id, allergenNames) {
  try {
    const res = await apiFetch(`/admin/dishes/${id}/override-allergens`, {
      method: "POST",
      body: JSON.stringify({ allergen_names: allergenNames }),
    });
    if (!res) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getMenus() {
  try {
    const res = await fetch("/api/menus");
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function getMenuBySlug(slug) {
  try {
    const res = await fetch(`/api/menu?menu=${slug}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getMenu() {
  try {
    const res = await fetch("/api/menu");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getAllergens() {
  try {
    const res = await fetch("/api/menu/allergens");
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchCategories() {
  try {
    const res = await fetch("/api/menu/categories");
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function submitOrder(orderData) {
  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });
    if (!res.ok) return { error: "Order failed" };
    return await res.json();
  } catch {
    return { error: "Network error" };
  }
}

export async function getPairings(dishId) {
  try {
    const res = await fetch(`/api/pairings/${dishId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function getAdminOrders(status) {
  try {
    const url = status ? `/admin/orders?status=${status}` : "/admin/orders";
    const res = await apiFetch(url);
    if (!res) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function updateOrderStatus(orderId, status) {
  try {
    const res = await apiFetch(`/admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!res) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getDishOptions(dishId) {
  try {
    const res = await fetch(`/api/dish-options/${dishId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

export async function submitPreOrder(data) {
  try {
    const res = await fetch("/api/pre-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { error: err.error || "Failed to submit pre-order" };
    }
    return await res.json();
  } catch { return { error: "Network error" }; }
}

export async function getPreOrderStatus(ref) {
  try {
    const res = await fetch(`/api/pre-orders/${ref}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function getAdminPreOrders() {
  try {
    const res = await apiFetch("/admin/pre-orders");
    if (!res) return [];
    return await res.json();
  } catch { return []; }
}

export async function getAdminPreOrderDetail(id) {
  try {
    const res = await apiFetch(`/admin/pre-orders/${id}`);
    if (!res) return null;
    return await res.json();
  } catch { return null; }
}

export async function updatePreOrderStatus(id, status) {
  try {
    const res = await apiFetch(`/admin/pre-orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!res) return null;
    return await res.json();
  } catch { return null; }
}
