const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { shopName, email, password } = req.body;

    if (!shopName || !email || !password) {
      return res.status(400).json({ error: "shopName, email and password are required" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { shopName, email, password: hashedPassword },
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    res.json({
      token,
      user: { id: user.id, shopName: user.shopName, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    res.json({
      token,
      user: { id: user.id, shopName: user.shopName, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/auth/me - get current shop's profile
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "Shop not found" });
  res.json({
    id: user.id, shopName: user.shopName, email: user.email,
    phone: user.phone, gstNumber: user.gstNumber, invoicePrefix: user.invoicePrefix,
  });
});

// PUT /api/auth/me - update shop settings shown on invoices
router.put("/me", requireAuth, async (req, res) => {
  try {
    const { shopName, phone, gstNumber, invoicePrefix } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        shopName: shopName || undefined,
        phone: phone !== undefined ? phone : undefined,
        gstNumber: gstNumber !== undefined ? gstNumber : undefined,
        invoicePrefix: invoicePrefix || undefined,
      },
    });
    res.json({
      id: updated.id, shopName: updated.shopName, email: updated.email,
      phone: updated.phone, gstNumber: updated.gstNumber, invoicePrefix: updated.invoicePrefix,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

module.exports = router;
