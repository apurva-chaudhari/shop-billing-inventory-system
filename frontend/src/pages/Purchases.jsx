import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

export default function Purchases() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [history, setHistory] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [cart, setCart] = useState([]); // { productId, name, costEach, quantity }
  const [paidAmount, setPaidAmount] = useState("");
  const [error, setError] = useState("");

  function loadAll() {
    api.get("/products").then((res) => setProducts(res.data));
    api.get("/suppliers").then((res) => setSuppliers(res.data));
    api.get("/purchases").then((res) => setHistory(res.data));
  }
  useEffect(loadAll, []);

  function addToCart(product) {
    if (cart.find((c) => c.productId === product.id)) return;
    setCart([...cart, { productId: product.id, name: product.name, costEach: product.price, quantity: 1 }]);
  }

  function updateLine(productId, field, value) {
    setCart(cart.map((c) => (c.productId === productId ? { ...c, [field]: parseFloat(value) || 0 } : c)));
  }

  function removeLine(productId) {
    setCart(cart.filter((c) => c.productId !== productId));
  }

  const total = cart.reduce((sum, c) => sum + c.costEach * c.quantity, 0);

  async function handleSubmit() {
    setError("");
    if (!supplierId) return setError("Select a supplier first");
    if (cart.length === 0) return setError("Add at least one product");

    try {
      await api.post("/purchases", {
        supplierId: parseInt(supplierId),
        billNumber: billNumber || undefined,
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity, costEach: c.costEach })),
        paidAmount: paidAmount === "" ? total : parseFloat(paidAmount),
      });
      setCart([]);
      setBillNumber("");
      setPaidAmount("");
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to record purchase");
    }
  }

  return (
    <div>
      <h3 className="page-title">Purchases (Stock In)</h3>

      {suppliers.length === 0 ? (
        <div className="alert alert-warning d-flex justify-content-between align-items-center">
          <span>Add a supplier first before recording a purchase.</span>
          <Link className="btn btn-sm btn-outline-primary" to="/suppliers">Add Supplier</Link>
        </div>
      ) : (
        <div className="card p-3 mb-4">
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="row g-2 mb-3">
            <div className="col-md-4">
              <label className="form-label small">Supplier</label>
              <select className="form-select" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Select supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small">Supplier's Bill No. (optional)</label>
              <input className="form-control" value={billNumber} onChange={(e) => setBillNumber(e.target.value)} />
            </div>
          </div>

          <label className="form-label small">Add products received</label>
          <div className="row g-2 mb-3">
            {products.map((p) => (
              <div className="col-md-3" key={p.id}>
                <button className="btn btn-sm btn-outline-primary w-100" onClick={() => addToCart(p)}>
                  + {p.name}
                </button>
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <table className="table table-sm">
              <thead><tr><th>Product</th><th>Qty</th><th>Cost/unit</th><th>Subtotal</th><th></th></tr></thead>
              <tbody>
                {cart.map((c) => (
                  <tr key={c.productId}>
                    <td>{c.name}</td>
                    <td>
                      <input type="number" className="form-control form-control-sm" style={{ width: "80px" }}
                        value={c.quantity} onChange={(e) => updateLine(c.productId, "quantity", e.target.value)} />
                    </td>
                    <td>
                      <input type="number" className="form-control form-control-sm" style={{ width: "90px" }}
                        value={c.costEach} onChange={(e) => updateLine(c.productId, "costEach", e.target.value)} />
                    </td>
                    <td>₹{(c.costEach * c.quantity).toFixed(2)}</td>
                    <td><button className="btn btn-sm btn-outline-danger" onClick={() => removeLine(c.productId)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="row g-2 align-items-end mt-2">
            <div className="col-md-3">
              <label className="form-label small">Amount Paid Now</label>
              <input className="form-control" type="number" placeholder={`Full ₹${total.toFixed(2)}`}
                value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary w-100" onClick={handleSubmit}>
                Record Purchase (₹{total.toFixed(2)})
              </button>
            </div>
          </div>
        </div>
      )}

      <h5 className="mb-3">Purchase History</h5>
      <table className="table">
        <thead><tr><th>Date</th><th>Supplier</th><th>Bill No.</th><th>Total</th><th>Paid</th></tr></thead>
        <tbody>
          {history.map((p) => (
            <tr key={p.id}>
              <td>{new Date(p.createdAt).toLocaleDateString()}</td>
              <td>{p.supplier.name}</td>
              <td>{p.billNumber || "—"}</td>
              <td>₹{p.totalAmount.toFixed(2)}</td>
              <td>₹{p.paidAmount.toFixed(2)}</td>
            </tr>
          ))}
          {history.length === 0 && <tr><td colSpan="5" className="text-muted">No purchases recorded yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
