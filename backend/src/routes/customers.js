const express = require("express");
const prisma = require("../utils/prisma");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/customers - list all customers (Khata book)
router.get("/", async (req, res) => {
  const customers = await prisma.customer.findMany({
    where: { ownerId: req.userId },
    orderBy: { dueAmount: "desc" }, // biggest dues shown first
  });
  res.json(customers);
});

// POST /api/customers - manually add a customer (usually created automatically during billing)
router.post("/", async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Customer name is required" });

    const customer = await prisma.customer.create({
      data: { name: name.trim(), phone: phone || null, ownerId: req.userId },
    });
    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add customer" });
  }
});

// POST /api/customers/:id/pay - record a payment received from a customer (reduces due amount)
router.post("/:id/pay", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Enter a valid payment amount" });

    const customer = await prisma.customer.findFirst({ where: { id, ownerId: req.userId } });
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const updated = await prisma.customer.update({
      where: { id },
      data: { dueAmount: { decrement: parseFloat(amount) } },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

// GET /api/customers/:id/bills - a customer's bill history (useful for Khata detail view)
router.get("/:id/bills", async (req, res) => {
  const id = parseInt(req.params.id);
  const bills = await prisma.bill.findMany({
    where: { customerId: id, ownerId: req.userId },
    orderBy: { createdAt: "desc" },
  });
  res.json(bills);
});

module.exports = router;
