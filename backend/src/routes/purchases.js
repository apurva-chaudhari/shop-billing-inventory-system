const express = require("express");
const prisma = require("../utils/prisma");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/purchases - list purchase history
router.get("/", async (req, res) => {
  const purchases = await prisma.purchase.findMany({
    where: { ownerId: req.userId },
    include: { items: { include: { product: true } }, supplier: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(purchases);
});

// POST /api/purchases - record a new purchase (stock comes IN)
// body: { supplierId, billNumber?, items: [{ productId, quantity, costEach }], paidAmount }
router.post("/", async (req, res) => {
  const { supplierId, billNumber, items, paidAmount } = req.body;

  if (!supplierId) return res.status(400).json({ error: "Supplier is required" });
  if (!items || items.length === 0) return res.status(400).json({ error: "Add at least one item" });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({ where: { id: supplierId, ownerId: req.userId } });
      if (!supplier) throw new Error("Supplier not found");

      let totalAmount = 0;
      const purchaseItemsData = [];

      for (const item of items) {
        const product = await tx.product.findFirst({ where: { id: item.productId, ownerId: req.userId } });
        if (!product) throw new Error(`Product not found`);

        const subtotal = item.costEach * item.quantity;
        totalAmount += subtotal;

        purchaseItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          costEach: item.costEach,
          subtotal,
        });
      }

      const purchase = await tx.purchase.create({
        data: {
          billNumber: billNumber || null,
          totalAmount,
          paidAmount: paidAmount !== undefined ? parseFloat(paidAmount) : totalAmount,
          ownerId: req.userId,
          supplierId,
          items: { create: purchaseItemsData },
        },
        include: { items: { include: { product: true } }, supplier: true },
      });

      // Stock goes UP for each item purchased
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { increment: item.quantity } },
        });
      }

      // Track what's still owed to the supplier
      const due = totalAmount - (paidAmount !== undefined ? parseFloat(paidAmount) : totalAmount);
      if (due > 0) {
        await tx.supplier.update({
          where: { id: supplierId },
          data: { dueAmount: { increment: due } },
        });
      }

      return purchase;
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Failed to record purchase" });
  }
});

module.exports = router;
