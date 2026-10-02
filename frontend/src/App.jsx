import React from "react";
import {
  LayoutDashboard,
  Receipt,
  Package,
  History,
  Users,
  Truck,
  ShoppingCart,
  Settings as SettingsIcon,
  LogOut,
  Store,
} from "lucide-react";
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from "react-router-dom";

import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import Billing from "./pages/Billing.jsx";
import BillHistory from "./pages/BillHistory.jsx";
import InvoiceView from "./pages/InvoiceView.jsx";
import Settings from "./pages/Settings.jsx";
import Customers from "./pages/Customers.jsx";
import Suppliers from "./pages/Suppliers.jsx";
import Purchases from "./pages/Purchases.jsx";

// Wrapper that blocks access if not logged in
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const shopName = localStorage.getItem("shopName") || "Shop Billing";
  const shopInitials = shopName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("") || "SB";

  function logout() {
    localStorage.clear();
    navigate("/login");
  }

  if (!localStorage.getItem("token")) return null;

  const links = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/billing", label: "New Bill", icon: Receipt },
    { to: "/products", label: "Products", icon: Package },
    { to: "/bills", label: "Bill History", icon: History },
    { to: "/customers", label: "Customer Khata", icon: Users },
    { to: "/suppliers", label: "Suppliers", icon: Truck },
    { to: "/purchases", label: "Purchases", icon: ShoppingCart },
    { to: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <aside className="sidebar no-print">
      <div className="brand-block">
        <div className="brand-mark"><span className="brand-initials">{shopInitials}</span></div>
        <div className="brand-copy">
          <div className="brand-title" title={shopName}>{shopName}</div>
          <div className="brand-subtitle">Billing & Inventory</div>
        </div>
      </div>

      <div className="shop-chip">
        <span className="shop-chip-dot" />
        <span title={shopName}>{shopName}</span>
      </div>

      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="sidebar-nav">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <Link key={l.to} to={l.to} className={location.pathname === l.to ? "active" : ""}>
              <Icon size={17} strokeWidth={2} />
              <span>{l.label}</span>
            </Link>
          );
        })}
      </nav>

      <button className="logout-btn" onClick={logout}>
        <LogOut size={16} />
        <span>Logout</span>
      </button>
    </aside>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
            <Route path="/bills" element={<ProtectedRoute><BillHistory /></ProtectedRoute>} />
            <Route path="/invoice/:id" element={<ProtectedRoute><InvoiceView /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
            <Route path="/purchases" element={<ProtectedRoute><Purchases /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
