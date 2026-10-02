require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const billRoutes = require("./routes/bills");
const categoryRoutes = require("./routes/categories");
const supplierRoutes = require("./routes/suppliers");
const purchaseRoutes = require("./routes/purchases");
const customerRoutes = require("./routes/customers");

const app = express();

app.use(cors()); // allows your React frontend (different port) to call this API
app.use(express.json()); // parses JSON request bodies

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/customers", customerRoutes);

app.get("/", (req, res) => {
  res.json({ status: "Shop Billing API is running" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
