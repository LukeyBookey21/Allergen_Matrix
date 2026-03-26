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
  const res = await apiFetch("/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function logout() {
  await apiFetch("/admin/logout");
}

export async function getMe() {
  const res = await apiFetch("/admin/me");
  return res?.ok ? res.json() : null;
}

export async function getAdminDishes() {
  const res = await apiFetch("/admin/dishes");
  return res?.json();
}

export async function getAdminMenus() {
  const res = await apiFetch("/admin/menus");
  return res?.json();
}

export async function createDish(data) {
  const res = await apiFetch("/admin/dishes", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateDish(id, data) {
  const res = await apiFetch(`/admin/dishes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteDish(id) {
  const res = await apiFetch(`/admin/dishes/${id}`, { method: "DELETE" });
  return res.json();
}

export async function toggleDish(id) {
  const res = await apiFetch(`/admin/dishes/${id}/toggle`, { method: "PATCH" });
  return res.json();
}

export async function toggleSpecial(id) {
  const res = await apiFetch(`/admin/dishes/${id}/toggle-special`, { method: "PATCH" });
  return res.json();
}

export async function detectAllergens(ingredients) {
  const res = await apiFetch("/admin/detect-allergens", {
    method: "POST",
    body: JSON.stringify({ ingredients }),
  });
  return res.json();
}

export async function overrideAllergens(id, allergenNames) {
  const res = await apiFetch(`/admin/dishes/${id}/override-allergens`, {
    method: "POST",
    body: JSON.stringify({ allergen_names: allergenNames }),
  });
  return res.json();
}

export async function getMenus() {
  const res = await fetch("/menus");
  return res.json();
}

export async function getMenuBySlug(slug) {
  const res = await fetch(`/menu?menu=${slug}`);
  return res.json();
}

export async function getMenu() {
  const res = await fetch("/menu");
  return res.json();
}

export async function getAllergens() {
  const res = await fetch("/menu/allergens");
  return res.json();
}

export async function fetchCategories() {
  const res = await fetch("/menu/categories");
  return res.json();
}
