const express = require("express");
const prisma = require("../utils/prisma");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/suppliers - list all suppliers
router.get("/", async (req, res) => {
  const suppliers = await prisma.supplier.findMany({
    where: { ownerId: req.userId },
    orderBy: { name: "asc" },
  });
  res.json(suppliers);
});

// POST /api/suppliers - add a supplier
router.post("/", async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Supplier name is required" });

    const existing = await prisma.supplier.findMany({ where: { ownerId: req.userId } });
    const duplicate = existing.find((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (duplicate) return res.status(400).json({ error: `"${name}" already exists in your suppliers` });

    const supplier = await prisma.supplier.create({
      data: { name: name.trim(), phone: phone || null, ownerId: req.userId },
    });
    res.json(supplier);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add supplier" });
  }
});

// POST /api/suppliers/:id/pay - record a payment made to a supplier (reduces due amount)
router.post("/:id/pay", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Enter a valid payment amount" });

    const supplier = await prisma.supplier.findFirst({ where: { id, ownerId: req.userId } });
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });

    const updated = await prisma.supplier.update({
      where: { id },
      data: { dueAmount: { decrement: parseFloat(amount) } },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

// DELETE /api/suppliers/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.supplier.findFirst({ where: { id, ownerId: req.userId } });
    if (!existing) return res.status(404).json({ error: "Supplier not found" });

    await prisma.supplier.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    // If the supplier has purchase history linked, Prisma blocks deletion (P2003)
    if (err.code === "P2003") {
      return res.status(400).json({ error: "Can't delete a supplier with purchase history. Consider keeping it for records." });
    }
    res.status(500).json({ error: "Failed to delete supplier" });
  }
});

module.exports = router;
