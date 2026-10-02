import React, { useEffect, useState } from "react";
import api from "../api";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [payAmount, setPayAmount] = useState({}); // { customerId: amount }
  const [error, setError] = useState("");

  function load() {
    api.get("/customers").then((res) => setCustomers(res.data));
  }

  useEffect(load, []);

  async function recordPayment(customerId) {
    const amount = payAmount[customerId];
    if (!amount || parseFloat(amount) <= 0) return;
    setError("");
    try {
      await api.post(`/customers/${customerId}/pay`, { amount: parseFloat(amount) });
      setPayAmount({ ...payAmount, [customerId]: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to record payment");
    }
  }

  const totalDue = customers.reduce((sum, c) => sum + c.dueAmount, 0);

  return (
    <div>
      <h3 className="page-title">Customer Khata</h3>

      <div className="stat-card mb-4" style={{ maxWidth: "280px" }}>
        <div className="stat-label">Total Outstanding</div>
        <div className="stat-value">₹{totalDue.toFixed(2)}</div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {customers.length === 0 && (
        <p className="text-muted">
          No customers yet — customers are added automatically when you enter their name while billing.
        </p>
      )}

      <table className="table">
        <thead>
          <tr><th>Customer</th><th>Phone</th><th>Due Amount</th><th>Record Payment</th></tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.phone || "—"}</td>
              <td>
                {c.dueAmount > 0
                  ? <span className="badge-low-stock">₹{c.dueAmount.toFixed(2)}</span>
                  : <span className="text-muted">Clear</span>}
              </td>
              <td>
                {c.dueAmount > 0 && (
                  <div className="d-flex gap-2">
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      style={{ width: "110px" }}
                      placeholder="Amount"
                      value={payAmount[c.id] || ""}
                      onChange={(e) => setPayAmount({ ...payAmount, [c.id]: e.target.value })}
                    />
                    <button className="btn btn-sm btn-primary" onClick={() => recordPayment(c.id)}>
                      Received
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
