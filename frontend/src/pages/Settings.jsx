import React, { useEffect, useState } from "react";
import api from "../api";

export default function Settings() {
  const [profile, setProfile] = useState({ shopName: "", phone: "", gstNumber: "", invoicePrefix: "" });
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [categoryError, setCategoryError] = useState("");

  useEffect(() => {
    api.get("/auth/me").then((res) => setProfile({
      shopName: res.data.shopName,
      phone: res.data.phone || "",
      gstNumber: res.data.gstNumber || "",
      invoicePrefix: res.data.invoicePrefix || "INV",
    }));
    loadCategories();
  }, []);

  function loadCategories() {
    api.get("/categories").then((res) => setCategories(res.data));
  }

  async function saveProfile(e) {
    e.preventDefault();
    setProfileError("");
    setProfileSaved(false);
    try {
      const res = await api.put("/auth/me", profile);
      localStorage.setItem("shopName", res.data.shopName);
      setProfileSaved(true);
    } catch (err) {
      setProfileError(err.response?.data?.error || "Failed to save");
    }
  }

  async function addCategory(e) {
    e.preventDefault();
    setCategoryError("");
    if (!newCategory.trim()) return;
    try {
      await api.post("/categories", { name: newCategory.trim() });
      setNewCategory("");
      loadCategories();
    } catch (err) {
      setCategoryError(err.response?.data?.error || "Failed to add category");
    }
  }

  async function deleteCategory(id) {
    if (!confirm("Delete this category? Products in it will become 'Uncategorized'.")) return;
    await api.delete(`/categories/${id}`);
    loadCategories();
  }

  return (
    <div>
      <h3 className="page-title">Settings</h3>

      <div className="row g-4">
        <div className="col-md-6">
          <div className="card p-4">
            <h5 className="mb-3">Shop Profile</h5>
            <p className="text-muted small mb-3">
              Your phone number is printed on every invoice so customers can reach you with billing queries.
            </p>
            {profileError && <div className="alert alert-danger py-2">{profileError}</div>}
            {profileSaved && <div className="alert alert-success py-2">Saved.</div>}
            <form onSubmit={saveProfile}>
              <label className="form-label small">Shop Name</label>
              <input
                className="form-control mb-3"
                value={profile.shopName}
                onChange={(e) => setProfile({ ...profile, shopName: e.target.value })}
                required
              />
              <label className="form-label small">Owner / Shop Phone Number</label>
              <input
                className="form-control mb-3"
                placeholder="e.g. 9876543210"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
              <label className="form-label small">GST Number (optional)</label>
              <input
                className="form-control mb-3"
                placeholder="e.g. 27ABCDE1234F1Z5"
                value={profile.gstNumber}
                onChange={(e) => setProfile({ ...profile, gstNumber: e.target.value })}
              />
              <label className="form-label small">Invoice Number Prefix</label>
              <input
                className="form-control mb-3"
                placeholder="e.g. SPH"
                value={profile.invoicePrefix}
                onChange={(e) => setProfile({ ...profile, invoicePrefix: e.target.value })}
              />
              <button className="btn btn-primary" type="submit">Save Profile</button>
            </form>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card p-4">
            <h5 className="mb-3">Product Categories</h5>
            <p className="text-muted small mb-3">
              Define categories that fit your shop — e.g. a clothing shop might use Kids, Mens, Womens;
              a paint shop might use Emulsion, Enamel, Primer.
            </p>
            {categoryError && <div className="alert alert-danger py-2">{categoryError}</div>}
            <form className="d-flex gap-2 mb-3" onSubmit={addCategory}>
              <input
                className="form-control"
                placeholder="New category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <button className="btn btn-primary" type="submit">Add</button>
            </form>

            {categories.length === 0 && <p className="text-muted">No categories yet — add your first one above.</p>}

            <div className="d-flex flex-wrap gap-2">
              {categories.map((c) => (
                <span key={c.id} className="badge-category d-flex align-items-center gap-2">
                  {c.name}
                  <button
                    onClick={() => deleteCategory(c.id)}
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 700, padding: 0 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
