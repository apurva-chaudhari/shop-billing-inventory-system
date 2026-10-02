import React, { useEffect, useState } from "react";
import api from "../api";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [payAmount, setPayAmount] = useState({});
  const [error, setError] = useState("");

  function load() {
    api.get("/suppliers").then((res) => setSuppliers(res.data));
  }
  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/suppliers", form);
      setForm({ name: "", phone: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add supplier");
    }
  }

  async function recordPayment(supplierId) {
    const amount = payAmount[supplierId];
    if (!amount || parseFloat(amount) <= 0) return;
    await api.post(`/suppliers/${supplierId}/pay`, { amount: parseFloat(amount) });
    setPayAmount({ ...payAmount, [supplierId]: "" });
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this supplier?")) return;
    try {
      await api.delete(`/suppliers/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete");
    }
  }

  return (
    <div>
      <h3 className="page-title">Suppliers</h3>

      {error && <div className="alert alert-danger">{error}</div>}

      <form className="row g-2 mb-4 card p-3" onSubmit={handleAdd}>
        <div className="col-md-4">
          <input className="form-control" placeholder="Supplier name"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="col-md-3">
          <input className="form-control" placeholder="Phone (optional)"
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="col-md-2">
          <button className="btn btn-primary w-100" type="submit">Add Supplier</button>
        </div>
      </form>

      <table className="table">
        <thead>
          <tr><th>Name</th><th>Phone</th><th>You Owe</th><th>Pay Supplier</th><th></th></tr>
        </thead>
        <tbody>
          {suppliers.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.phone || "—"}</td>
              <td>
                {s.dueAmount > 0
                  ? <span className="badge-low-stock">₹{s.dueAmount.toFixed(2)}</span>
                  : <span className="text-muted">Clear</span>}
              </td>
              <td>
                {s.dueAmount > 0 && (
                  <div className="d-flex gap-2">
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      style={{ width: "110px" }}
                      placeholder="Amount"
                      value={payAmount[s.id] || ""}
                      onChange={(e) => setPayAmount({ ...payAmount, [s.id]: e.target.value })}
                    />
                    <button className="btn btn-sm btn-primary" onClick={() => recordPayment(s.id)}>Paid</button>
                  </div>
                )}
              </td>
              <td>
                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(s.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {suppliers.length === 0 && (
            <tr><td colSpan="5" className="text-muted">No suppliers yet — add one above.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
