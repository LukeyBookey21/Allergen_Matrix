import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getMe, getAdminDishes, deleteDish, toggleDish, logout } from "../api";
import AllergenBadge from "../components/AllergenBadge";

export default function AdminDashboard() {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrUrl, setQrUrl] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function init() {
      const me = await getMe();
      if (!me) return;
      const data = await getAdminDishes();
      setDishes(data || []);
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

  function handleShowQR() {
    setQrUrl("/admin/qr-code?" + Date.now());
  }

  async function handleLogout() {
    await logout();
    navigate("/admin/login");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-3">
          <button
            onClick={handleShowQR}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm"
          >
            QR Code
          </button>
          <Link
            to="/admin/dishes/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
          >
            + Add New Dish
          </Link>
          <button
            onClick={handleLogout}
            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {qrUrl && (
        <div className="bg-white rounded-lg shadow p-6 mb-6 text-center">
          <h2 className="text-lg font-semibold mb-4">Menu QR Code</h2>
          <img src={qrUrl} alt="QR Code" className="mx-auto mb-4 w-48 h-48" />
          <a
            href={qrUrl}
            download="menu-qr-code.png"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
          >
            Download QR Code
          </a>
          <button
            onClick={() => setQrUrl(null)}
            className="ml-3 text-gray-500 text-sm hover:text-gray-700"
          >
            Close
          </button>
        </div>
      )}

      {dishes.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">No dishes yet</p>
          <p>Add your first dish to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Price
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Allergens
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dishes.map((dish) => (
                <tr key={dish.id} className={!dish.active ? "opacity-50" : ""}>
                  <td className="px-4 py-3 font-medium">{dish.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    £{dish.price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(dish.id)}
                      className={`text-xs px-2 py-1 rounded-full ${
                        dish.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {dish.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {dish.allergens.map((a) => (
                        <AllergenBadge key={a.id} allergen={a} small />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/dishes/${dish.id}/edit`}
                      className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(dish.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
