const express = require("express");
const prisma = require("../utils/prisma");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// All routes below require login
router.use(requireAuth);

// GET /api/products - list all products for the logged-in shop
router.get("/", async (req, res) => {
  const products = await prisma.product.findMany({
    where: { ownerId: req.userId },
    include: { category: true },
    orderBy: { name: "asc" },
  });
  res.json(products);
});

// GET /api/products/barcode/:code - look up a product by scanned barcode (used by the Billing scanner)
router.get("/barcode/:code", async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { ownerId: req.userId, barcode: req.params.code },
    include: { category: true },
  });
  if (!product) return res.status(404).json({ error: "No product matches this barcode" });
  res.json(product);
});

// POST /api/products - add a new product
router.post("/", async (req, res) => {
  try {
    const { name, categoryId, barcode, unit, price, gstPercent, stockQty, lowStockAt } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: "name and price are required" });
    }

    // If a category was picked, make sure it actually belongs to this shop
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: parseInt(categoryId), ownerId: req.userId },
      });
      if (!category) return res.status(400).json({ error: "Invalid category" });
    }

    // Check if this shop already has a product with the same name (case-insensitive).
    // Note: SQLite doesn't support Prisma's "mode: insensitive" filter (that's Postgres-only),
    // so we fetch this shop's products and compare in JS instead.
    const shopProducts = await prisma.product.findMany({ where: { ownerId: req.userId } });
    const existing = shopProducts.find(
      (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()
    );

    if (existing) {
      return res.status(400).json({
        error: `"${name}" already exists in your inventory. Edit the existing product instead, or update its stock quantity.`,
      });
    }

    if (barcode && barcode.trim()) {
      const barcodeDuplicate = shopProducts.find((p) => p.barcode === barcode.trim());
      if (barcodeDuplicate) {
        return res.status(400).json({ error: `This barcode is already assigned to "${barcodeDuplicate.name}"` });
      }
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        categoryId: categoryId ? parseInt(categoryId) : null,
        barcode: barcode && barcode.trim() ? barcode.trim() : null,
        unit: unit || "pcs",
        price: parseFloat(price),
        gstPercent: gstPercent !== undefined ? parseFloat(gstPercent) : 18,
        stockQty: parseFloat(stockQty || 0),
        lowStockAt: parseFloat(lowStockAt || 5),
        ownerId: req.userId,
      },
      include: { category: true },
    });

    res.json(product);
  } catch (err) {
    console.error(err);
    // Prisma throws a unique-constraint error (P2002) as a backup safety net
    if (err.code === "P2002") {
      return res.status(400).json({ error: "A product with this name or barcode already exists." });
    }
    res.status(500).json({ error: "Failed to add product" });
  }
});

// PUT /api/products/:id - edit a product
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.product.findFirst({ where: { id, ownerId: req.userId } });
    if (!existing) return res.status(404).json({ error: "Product not found" });

    const { name, categoryId, barcode, unit, price, gstPercent, stockQty, lowStockAt } = req.body;

    // If renaming, make sure no OTHER product of this shop already has that name
    if (name && name.trim().toLowerCase() !== existing.name.trim().toLowerCase()) {
      const shopProducts = await prisma.product.findMany({ where: { ownerId: req.userId } });
      const duplicate = shopProducts.find(
        (p) => p.id !== id && p.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (duplicate) {
        return res.status(400).json({ error: `"${name}" already exists in your inventory.` });
      }
    }

    // If a barcode was given, make sure no OTHER product already uses it
    if (barcode && barcode.trim()) {
      const shopProducts = await prisma.product.findMany({ where: { ownerId: req.userId } });
      const barcodeDuplicate = shopProducts.find((p) => p.id !== id && p.barcode === barcode.trim());
      if (barcodeDuplicate) {
        return res.status(400).json({ error: `This barcode is already assigned to "${barcodeDuplicate.name}"` });
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: name ? name.trim() : existing.name,
        categoryId: categoryId !== undefined ? (categoryId ? parseInt(categoryId) : null) : existing.categoryId,
        barcode: barcode !== undefined ? (barcode.trim() ? barcode.trim() : null) : existing.barcode,
        unit: unit ?? existing.unit,
        price: price !== undefined ? parseFloat(price) : existing.price,
        gstPercent: gstPercent !== undefined ? parseFloat(gstPercent) : existing.gstPercent,
        stockQty: stockQty !== undefined ? parseFloat(stockQty) : existing.stockQty,
        lowStockAt: lowStockAt !== undefined ? parseFloat(lowStockAt) : existing.lowStockAt,
      },
      include: { category: true },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// DELETE /api/products/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.product.findFirst({ where: { id, ownerId: req.userId } });
    if (!existing) return res.status(404).json({ error: "Product not found" });

    await prisma.product.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    if (err.code === "P2003") {
      return res.status(400).json({
        error: "Can't delete this product because it's used in past bills or purchases. Consider setting its stock to 0 instead.",
      });
    }
    res.status(500).json({ error: "Failed to delete product" });
  }
});

module.exports = router;
