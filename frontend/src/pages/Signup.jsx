import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";

export default function Signup() {
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/signup", { shopName, email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("shopName", res.data.user.shopName);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-mark"><span>{shopName.trim() ? shopName.trim().split(/\s+/).slice(0, 2).map((word) => word[0].toUpperCase()).join("") : "SB"}</span></div>
          <div>
            <div className="auth-brand-title">{shopName.trim() || "Your Shop"}</div>
            <div className="auth-brand-subtitle">Billing & Inventory</div>
          </div>
        </div>
        <div className="auth-heading">
          <h3>Create your shop account</h3>
          <p>Set up your workspace in a few seconds.</p>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label className="form-label">Shop name</label>
          <input
            className="form-control mb-3"
            placeholder="Shop Name"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            required
          />
          <label className="form-label">Email address</label>
          <input
            className="form-control mb-3"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="form-label">Password</label>
          <input
            className="form-control mb-3"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="btn btn-primary w-100" type="submit">Sign Up</button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
