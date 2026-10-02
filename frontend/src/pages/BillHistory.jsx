import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

export default function BillHistory() {
  const [bills, setBills] = useState([]);

  useEffect(() => {
    api.get("/bills").then((res) => setBills(res.data));
  }, []);

  return (
    <div>
      <h3 className="page-title">Bill History</h3>
      <table className="table">
        <thead>
          <tr><th>Invoice No</th><th>Date</th><th>Customer</th><th>Total</th><th>Payment</th><th></th></tr>
        </thead>
        <tbody>
          {bills.map((b) => (
            <tr key={b.id}>
              <td>{b.invoiceNo}</td>
              <td>{new Date(b.createdAt).toLocaleString()}</td>
              <td>{b.customer?.name || "Walk-in"}</td>
              <td>₹{b.totalAmount.toFixed(2)}</td>
              <td>{b.paymentMode}</td>
              <td><Link className="btn btn-sm btn-outline-primary" to={`/invoice/${b.id}`}>View / Print</Link></td>
            </tr>
          ))}
          {bills.length === 0 && <tr><td colSpan="6" className="text-muted">No bills yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
