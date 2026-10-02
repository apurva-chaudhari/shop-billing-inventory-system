import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import BarcodeScanner from "../components/BarcodeScanner.jsx";
import {
  Plus,
  Search,
  Package,
  ScanLine,
  Pencil,
  Trash2,
  X,
  Tag,
  Boxes,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

const emptyForm = {
  name: "",
  categoryId: "",
  barcode: "",
  unit: "pcs",
  price: "",
  gstPercent: "18",
  stockQty: "",
  lowStockAt: "5",
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  function loadProducts() {
    api.get("/products").then((res) => setProducts(res.data));
  }

  function loadCategories() {
    api.get("/categories").then((res) => setCategories(res.data));
  }

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const payload = {
        ...form,
        categoryId: form.categoryId || null,
      };

      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        await api.post("/products", payload);
      }

      setForm(emptyForm);
      setEditingId(null);
      setFormOpen(false);
      loadProducts();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Something went wrong. Please try again."
      );
    }
  }

  function startEdit(p) {
    setEditingId(p.id);
    setError("");
    setFormOpen(true);

    setForm({
      name: p.name,
      categoryId: p.categoryId || "",
      barcode: p.barcode || "",
      unit: p.unit,
      price: p.price,
      gstPercent: p.gstPercent,
      stockQty: p.stockQty,
      lowStockAt: p.lowStockAt,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setFormOpen(false);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this product?")) return;

    try {
      await api.delete(`/products/${id}`);
      loadProducts();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete product");
    }
  }

  const filtered = products.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      activeCategory === "all" || p.categoryId === activeCategory;

    return matchesSearch && matchesCategory;
  });

  const lowStockCount = products.filter(
    (p) => Number(p.stockQty) <= Number(p.lowStockAt)
  ).length;

  const inStockCount = products.filter(
    (p) => Number(p.stockQty) > Number(p.lowStockAt)
  ).length;

  return (
    <div className="products-page">

      {/* PAGE HEADER */}
      <div className="products-hero">
        <div>
          <div className="products-eyebrow">
            <Package size={15} />
            INVENTORY
          </div>

          <h3 className="products-page-title">
            Products & Inventory
          </h3>

          <p className="products-page-subtitle">
            Manage your products, prices, stock levels and categories in one
            place.
          </p>
        </div>

        {!formOpen && (
          <button
            className="btn btn-primary products-add-btn"
            onClick={() => setFormOpen(true)}
          >
            <Plus size={17} />
            Add Product
          </button>
        )}
      </div>

      {/* SUMMARY CARDS */}
      <div className="products-summary-grid">

        <div className="products-summary-card">
          <div className="products-summary-icon">
            <Boxes size={18} />
          </div>

          <div>
            <span>Total Products</span>
            <strong>{products.length}</strong>
          </div>
        </div>

        <div className="products-summary-card">
          <div className="products-summary-icon">
            <Tag size={18} />
          </div>

          <div>
            <span>Categories</span>
            <strong>{categories.length}</strong>
          </div>
        </div>

        <div className="products-summary-card warning">
          <div className="products-summary-icon">
            <AlertTriangle size={18} />
          </div>

          <div>
            <span>Low Stock</span>
            <strong>{lowStockCount}</strong>
          </div>
        </div>

        <div className="products-summary-card success">
          <div className="products-summary-icon">
            <CheckCircle2 size={18} />
          </div>

          <div>
            <span>In Stock</span>
            <strong>{inStockCount}</strong>
          </div>
        </div>

      </div>

      {/* CATEGORY ALERT */}
      {categories.length === 0 && (
        <div className="products-alert">
          <div>
            <AlertTriangle size={18} />

            <span>
              You haven't set up any categories yet — products can still be
              added without one.
            </span>
          </div>

          <Link
            className="btn btn-sm btn-outline-primary"
            to="/settings"
          >
            Add categories
          </Link>
        </div>
      )}

      {/* PRODUCT FORM */}
      {formOpen && (
        <div className="products-form-card">

          <div className="products-form-header">
            <div>
              <span className="products-form-kicker">
                PRODUCT DETAILS
              </span>

              <h5>
                {editingId ? "Edit Product" : "Add New Product"}
              </h5>
            </div>

            <button
              className="products-icon-btn"
              onClick={cancelEdit}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            <div className="row g-3">

              <div className="col-md-6">
                <label className="form-label small fw-semibold">
                  Product Name *
                </label>

                <input
                  className="form-control"
                  placeholder="e.g. Asian Paints Tractor Emulsion 1L"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="col-md-3">
                <label className="form-label small fw-semibold">
                  Category
                </label>

                <select
                  className="form-select"
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      categoryId: e.target.value,
                    })
                  }
                >
                  <option value="">No category</option>

                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label small fw-semibold">
                  Unit
                </label>

                <input
                  className="form-control"
                  placeholder="litre, kg, pcs..."
                  value={form.unit}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      unit: e.target.value,
                    })
                  }
                />
              </div>

              <div className="col-md-6">
                <label className="form-label small fw-semibold">
                  Barcode
                </label>

                <div className="d-flex gap-2">

                  <input
                    className="form-control"
                    placeholder="Scan or type manually"
                    value={form.barcode}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        barcode: e.target.value,
                      })
                    }
                  />

                  <button
                    className="btn btn-outline-secondary products-scan-btn"
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    title="Scan barcode with camera"
                  >
                    <ScanLine size={17} />
                    Scan
                  </button>

                </div>
              </div>

              <div className="col-md-2">
                <label className="form-label small fw-semibold">
                  Price (₹) *
                </label>

                <input
                  className="form-control"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="col-md-2">
                <label className="form-label small fw-semibold">
                  GST %
                </label>

                <input
                  className="form-control"
                  type="number"
                  step="0.01"
                  value={form.gstPercent}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      gstPercent: e.target.value,
                    })
                  }
                />
              </div>

              <div className="col-md-2">
                <label className="form-label small fw-semibold">
                  Stock Qty
                </label>

                <input
                  className="form-control"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={form.stockQty}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      stockQty: e.target.value,
                    })
                  }
                />
              </div>

              <div className="col-md-2">
                <label className="form-label small fw-semibold">
                  Low Stock Alert At
                </label>

                <input
                  className="form-control"
                  type="number"
                  placeholder="5"
                  value={form.lowStockAt}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      lowStockAt: e.target.value,
                    })
                  }
                />
              </div>

            </div>

            <div className="d-flex gap-2 mt-4">

              <button
                className="btn btn-primary px-4"
                type="submit"
              >
                {editingId ? "Save Changes" : "Add Product"}
              </button>

              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={cancelEdit}
              >
                Cancel
              </button>

            </div>

          </form>
        </div>
      )}

      {/* BARCODE SCANNER */}
      {scannerOpen && (
        <BarcodeScanner
          onScan={(code) => {
            setForm((f) => ({
              ...f,
              barcode: code,
            }));

            setScannerOpen(false);
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* SEARCH TOOLBAR */}
      <div className="products-toolbar">

        <div className="products-search">
          <Search size={17} />

          <input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="products-count">
          Showing <strong>{filtered.length}</strong> of{" "}
          {products.length}
        </div>

      </div>

      {/* CATEGORY FILTER */}
      {categories.length > 0 && (
        <div className="products-category-bar">

          <button
            className={`products-category-chip ${
              activeCategory === "all" ? "active" : ""
            }`}
            onClick={() => setActiveCategory("all")}
          >
            All
            <span>{products.length}</span>
          </button>

          {categories.map((c) => (
            <button
              key={c.id}
              className={`products-category-chip ${
                activeCategory === c.id ? "active" : ""
              }`}
              onClick={() => setActiveCategory(c.id)}
            >
              {c.name}

              <span>
                {
                  products.filter(
                    (p) => p.categoryId === c.id
                  ).length
                }
              </span>
            </button>
          ))}

        </div>
      )}

      {/* PRODUCT TABLE */}
      <div className="products-table-card">

        <div className="products-table-head">

          <div>
            <h5>Product Catalog</h5>

            <span>
              Keep your inventory details up to date.
            </span>
          </div>

          <div className="products-table-label">
            <Package size={16} />
            {filtered.length} items
          </div>

        </div>

        <div className="table-responsive">

          <table className="table products-table mb-0">

            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Price</th>
                <th>GST</th>
                <th>Stock</th>
                <th className="text-end">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>

              {filtered.map((p) => {

                const low =
                  Number(p.stockQty) <=
                  Number(p.lowStockAt);

                return (
                  <tr key={p.id}>

                    <td>
                      <div className="product-name-cell">

                        <div className="product-avatar">
                          {p.name
                            ?.trim()
                            ?.charAt(0)
                            ?.toUpperCase() || "P"}
                        </div>

                        <div>

                          <div className="product-name">
                            {p.name}
                          </div>

                          {p.barcode && (
                            <div className="product-barcode">
                              #{p.barcode}
                            </div>
                          )}

                        </div>

                      </div>
                    </td>

                    <td>
                      {p.category ? (
                        <span className="badge-category">
                          {p.category.name}
                        </span>
                      ) : (
                        <span className="product-muted">
                          No category
                        </span>
                      )}
                    </td>

                    <td className="product-muted">
                      {p.unit}
                    </td>

                    <td className="product-price">
                      ₹{p.price}
                    </td>

                    <td className="product-muted">
                      {p.gstPercent}%
                    </td>

                    <td>

                      <div
                        className={`stock-value ${
                          low ? "low" : ""
                        }`}
                      >
                        {p.stockQty}

                        <span>
                          {p.unit}
                        </span>

                        {low && (
                          <span className="badge-low-stock">
                            Low
                          </span>
                        )}
                      </div>

                    </td>

                    <td>

                      <div className="product-actions">

                        <button
                          className="product-action edit"
                          onClick={() => startEdit(p)}
                          title="Edit"
                        >
                          <Pencil size={15} />
                          Edit
                        </button>

                        <button
                          className="product-action delete"
                          onClick={() =>
                            handleDelete(p.id)
                          }
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>

                      </div>

                    </td>

                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7">

                    <div className="products-empty">

                      <div className="products-empty-icon">
                        <Package size={24} />
                      </div>

                      <strong>
                        {products.length === 0
                          ? "No products yet"
                          : "No products found"}
                      </strong>

                      <span>
                        {products.length === 0
                          ? 'Click "Add Product" to create your first inventory item.'
                          : "Try a different search or category."}
                      </span>

                      {products.length === 0 && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() =>
                            setFormOpen(true)
                          }
                        >
                          <Plus size={15} />
                          Add Product
                        </button>
                      )}

                    </div>

                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>
      </div>

    </div>
  );
}