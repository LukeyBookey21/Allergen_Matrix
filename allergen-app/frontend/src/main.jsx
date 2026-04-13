import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import CustomerMenu from "./pages/CustomerMenu";
import AdminDashboard from "./pages/AdminDashboard";
import AddEditDish from "./pages/AddEditDish";
import Login from "./pages/Login";
import PreOrder from "./pages/PreOrder";
import AmendPreOrder from "./pages/AmendPreOrder";

function NotFound() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-display text-6xl font-bold text-slate-300 mb-4">404</h1>
        <p className="text-slate-500 mb-4">Page not found</p>
        <a href="/menu" className="text-amber-600 font-medium hover:text-amber-700">Back to menu</a>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CustomerMenu />} />
        <Route path="/menu" element={<CustomerMenu />} />
        <Route path="/menu/:menuSlug" element={<CustomerMenu />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/dishes/new" element={<AddEditDish />} />
        <Route path="/admin/dishes/:id/edit" element={<AddEditDish />} />
        <Route path="/pre-order" element={<PreOrder />} />
        <Route path="/pre-order/amend/:reference" element={<AmendPreOrder />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
