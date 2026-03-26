import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import CustomerMenu from "./pages/CustomerMenu";
import AdminDashboard from "./pages/AdminDashboard";
import AddEditDish from "./pages/AddEditDish";
import Login from "./pages/Login";

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
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
