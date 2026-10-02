const express = require("express");
const prisma = require("../utils/prisma");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/categories - list this shop's categories
router.get("/", async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { ownerId: req.userId },
    orderBy: { name: "asc" },
  });
  res.json(categories);
});

// POST /api/categories - add a new category (e.g. "Kids", "Mens", "Womens")
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const existing = await prisma.category.findMany({ where: { ownerId: req.userId } });
    const duplicate = existing.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (duplicate) {
      return res.status(400).json({ error: `"${name}" category already exists` });
    }

    const category = await prisma.category.create({
      data: { name: name.trim(), ownerId: req.userId },
    });
    res.json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add category" });
  }
});

// DELETE /api/categories/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.category.findFirst({ where: { id, ownerId: req.userId } });
    if (!existing) return res.status(404).json({ error: "Category not found" });

    // Unlink products from this category first (so their categoryId becomes null, they aren't deleted)
    await prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
    await prisma.category.delete({ where: { id } });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

module.exports = router;
