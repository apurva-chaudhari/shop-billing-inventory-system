const express = require("express");
const prisma = require("../utils/prisma");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/bills - list bills (most recent first)
router.get("/", async (req, res) => {
  const bills = await prisma.bill.findMany({
    where: { ownerId: req.userId },
    include: { items: { include: { product: true } }, customer: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(bills);
});

// GET /api/bills/:id - single bill (for printing/viewing)
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const bill = await prisma.bill.findFirst({
    where: { id, ownerId: req.userId },
    include: {
      items: { include: { product: true } },
      customer: true,
      owner: { select: { shopName: true, phone: true, gstNumber: true } },
    },
  });
  if (!bill) return res.status(404).json({ error: "Bill not found" });
  res.json(bill);
});

// POST /api/bills - create a new bill (the core billing action)
// body: { items: [{ productId, quantity }], customerId?, customerName?, customerPhone?, paidAmount, paymentMode }
router.post("/", async (req, res) => {
  const { items, customerId, customerName, customerPhone, paidAmount, paymentMode } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "Bill must have at least one item" });
  }

  try {
    // A transaction ensures: either EVERYTHING saves correctly (bill + stock update),
    // or NOTHING does. This prevents half-saved/corrupted bills.
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch all products in this bill and verify stock
      const productIds = items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, ownerId: req.userId },
      });

      const productMap = {};
      products.forEach((p) => (productMap[p.id] = p));

      let subTotal = 0; // sum before GST
      let gstAmount = 0; // total GST across all items
      const billItemsData = [];

      for (const item of items) {
        const product = productMap[item.productId];
        if (!product) throw new Error(`Product ${item.productId} not found`);
        if (product.stockQty < item.quantity) {
          throw new Error(`Not enough stock for ${product.name}. Available: ${product.stockQty}`);
        }

        const lineSubtotal = product.price * item.quantity;
        const lineGst = lineSubtotal * (product.gstPercent / 100);

        subTotal += lineSubtotal;
        gstAmount += lineGst;

        billItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          priceEach: product.price,
          gstPercent: product.gstPercent,
          subtotal: lineSubtotal,
          gstAmount: lineGst,
        });
      }

      const totalAmount = subTotal + gstAmount;

      // 2. Handle customer (create new one if name given but no id)
      let finalCustomerId = customerId || null;
      if (!finalCustomerId && customerName) {
        const newCustomer = await tx.customer.create({
          data: { name: customerName, phone: customerPhone || null, ownerId: req.userId },
        });
        finalCustomerId = newCustomer.id;
      }

      // 3. Generate invoice number using this shop's custom prefix (set in Settings)
      const owner = await tx.user.findUnique({ where: { id: req.userId } });
      const billCount = await tx.bill.count({ where: { ownerId: req.userId } });
      const invoiceNo = `${owner.invoicePrefix || "INV"}-${1000 + billCount + 1}`;

      // 4. Create the bill with its items
      const bill = await tx.bill.create({
        data: {
          invoiceNo,
          subTotal,
          gstAmount,
          totalAmount,
          paidAmount: paidAmount !== undefined ? parseFloat(paidAmount) : totalAmount,
          paymentMode: paymentMode || "cash",
          ownerId: req.userId,
          customerId: finalCustomerId,
          items: { create: billItemsData },
        },
        include: { items: { include: { product: true } }, customer: true },
      });

      // 5. Reduce stock for each product sold
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { decrement: item.quantity } },
        });
      }

      // 6. If customer paid less than total, track it as due (credit/khata)
      if (finalCustomerId) {
        const due = totalAmount - (paidAmount !== undefined ? parseFloat(paidAmount) : totalAmount);
        if (due > 0) {
          await tx.customer.update({
            where: { id: finalCustomerId },
            data: { dueAmount: { increment: due } },
          });
        }
      }

      return bill;
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Failed to create bill" });
  }
});

// GET /api/bills/reports/summary - basic dashboard numbers
router.get("/reports/summary", async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaysBills = await prisma.bill.findMany({
    where: { ownerId: req.userId, createdAt: { gte: today } },
  });

  const todaysSales = todaysBills.reduce((sum, b) => sum + b.totalAmount, 0);

  const lowStockProducts = await prisma.product.findMany({
    where: { ownerId: req.userId },
  });
  const lowStock = lowStockProducts.filter((p) => p.stockQty <= p.lowStockAt);

  res.json({
    todaysSales,
    todaysBillCount: todaysBills.length,
    lowStockCount: lowStock.length,
    lowStockProducts: lowStock,
  });
});

// GET /api/bills/reports/analytics - data for the Sales Analytics Dashboard
// (top stat cards + Weekly Sales / Monthly Revenue / Top Products / Category Wise Sales charts)
router.get("/reports/analytics", async (req, res) => {
  const now = new Date();

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // include today = 7 days total

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // Pull everything we need in one go (bills + line items + product + category),
  // scoped to this shop, from the earliest point any chart needs.
  const bills = await prisma.bill.findMany({
    where: { ownerId: req.userId, createdAt: { gte: sixMonthsAgo } },
    include: { items: { include: { product: { include: { category: true } } } } },
    orderBy: { createdAt: "asc" },
  });

  const todaysBills = bills.filter((b) => b.createdAt >= today);
  const todaysSales = todaysBills.reduce((sum, b) => sum + b.totalAmount, 0);
  const gstCollectedToday = todaysBills.reduce((sum, b) => sum + b.gstAmount, 0);

  const products = await prisma.product.findMany({ where: { ownerId: req.userId } });
  const lowStockCount = products.filter((p) => p.stockQty <= p.lowStockAt).length;

  // ---- Weekly Sales: last 7 days ----
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklySales = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(sevenDaysAgo);
    day.setDate(day.getDate() + i);
    const dayEnd = new Date(day);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const total = bills
      .filter((b) => b.createdAt >= day && b.createdAt < dayEnd)
      .reduce((sum, b) => sum + b.totalAmount, 0);
    weeklySales.push({ label: dayLabels[day.getDay()], date: day.toISOString().slice(0, 10), total });
  }

  // ---- Monthly Revenue: last 6 months ----
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyRevenue = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const total = bills
      .filter((b) => b.createdAt >= monthStart && b.createdAt < monthEnd)
      .reduce((sum, b) => sum + b.totalAmount, 0);
    monthlyRevenue.push({ label: monthLabels[monthStart.getMonth()], total });
  }

  // ---- Top Products & Category Wise Sales: aggregate line items across the same window ----
  const productTotals = {}; // productId -> { name, revenue, qty }
  const categoryTotals = {}; // categoryName -> revenue

  for (const bill of bills) {
    for (const item of bill.items) {
      const lineRevenue = item.subtotal + item.gstAmount;
      const p = item.product;
      if (p) {
        if (!productTotals[p.id]) productTotals[p.id] = { name: p.name, revenue: 0, qty: 0 };
        productTotals[p.id].revenue += lineRevenue;
        productTotals[p.id].qty += item.quantity;

        const catName = p.category?.name || "Uncategorized";
        categoryTotals[catName] = (categoryTotals[catName] || 0) + lineRevenue;
      }
    }
  }

  const topProducts = Object.values(productTotals)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const categoryWiseSales = Object.entries(categoryTotals)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  res.json({
    todaysSales,
    todaysOrders: todaysBills.length,
    lowStockCount,
    gstCollectedToday,
    weeklySales,
    monthlyRevenue,
    topProducts,
    categoryWiseSales,
  });
});

module.exports = router;
