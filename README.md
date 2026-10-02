# Shop Billing App — Setup Guide

This is a working single-shop billing system:
- Backend: Node.js + Express + Prisma + SQLite
- Frontend: React + Vite + Bootstrap

## Prerequisites
Install these first (one-time):
1. **Node.js** (v18 or newer) — download from https://nodejs.org
2. A code editor — **VS Code** recommended
3. Internet connection (needed once, to download packages)

Check Node is installed by opening a terminal/command prompt and running:
```
node -v
npm -v
```

---

## STEP 1: Backend setup

Open a terminal in the `backend` folder:

```bash
cd backend
npm install
```

This downloads Express, Prisma, JWT, bcrypt, etc.

Create your `.env` file (copy the example):
```bash
cp .env.example .env
```
Open `.env` and change `JWT_SECRET` to any random long string.

Create the database (this reads `prisma/schema.prisma` and builds `dev.db`):
```bash
npx prisma migrate dev --name init
```

Start the backend server:
```bash
npm run dev
```

You should see: `Server running on http://localhost:5000`

Test it works by opening `http://localhost:5000` in your browser — you should see a JSON status message.

---

## STEP 2: Frontend setup

Open a **new** terminal (keep backend running) in the `frontend` folder:

```bash
cd frontend
npm install
npm run dev
```

You should see something like: `Local: http://localhost:5173`

Open that URL in your browser. You'll see the Login page.

---

## STEP 3: Using the app

1. Click **Sign up**, create a shop account (shop name, email, password)
2. You'll land on the Dashboard
3. Go to **Products** → add your paint products (name, category, unit, price, stock quantity)
4. Go to **New Bill** → search a product, click Add, adjust quantity, optionally add customer name
5. Click **Generate Bill & Print** → this saves the bill, reduces stock automatically, and takes you to a printable invoice
6. Click **🖨️ Print Invoice** to print (uses your browser's print dialog — connect it to your printer)
7. **Bill History** shows all past bills, each can be reopened and reprinted

---

## STEP 4: Accessing from your phone (same wifi network)

1. Find your laptop's local IP address:
   - Windows: run `ipconfig` in cmd, look for "IPv4 Address" (e.g. `192.168.1.5`)
   - Mac: System Settings → Wifi → Details
2. In `frontend/src/api.js`, change:
   ```js
   const API_BASE_URL = "http://192.168.1.5:5000/api"; // your laptop's IP
   ```
3. On your phone (connected to the same wifi), open:
   ```
   http://192.168.1.5:5173
   ```
4. You'll see the same app — login with the same shop account.

Note: your laptop must stay on and both servers must be running for the phone to access it. For permanent access from anywhere, you'll need to deploy to a hosting service (see below).

---

## STEP 5: Deploying so it works from anywhere (not just wifi)

When you're ready to go live:

1. **Backend**: deploy to [Render](https://render.com) or [Railway](https://railway.app) (free tiers available)
   - Switch `DATABASE_URL` to a real PostgreSQL database (Render/Railway both offer free Postgres)
   - In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`
2. **Frontend**: deploy to [Vercel](https://vercel.com) or [Netlify](https://netlify.com) (free, connects to your GitHub repo)
3. Update `API_BASE_URL` in `frontend/src/api.js` to your deployed backend URL

---

# Shop Billing App — Setup Guide

A multi-feature shop billing system:
- Backend: Node.js + Express + Prisma + SQLite
- Frontend: React + Vite + Bootstrap

## Features included
- Shop signup/login (each shop's data is fully private)
- Products & Inventory with custom categories (Kids/Mens/Womens, or whatever fits your shop)
- Billing screen with GST calculation, auto stock deduction, printable invoices
- Customer Khata (credit/due tracking with payment recording)
- Supplier management + Purchase recording (stock increases only via recorded purchases)
- Shop Settings: phone number, GST number, custom invoice prefix — all shown on invoices
- Dashboard with today's sales, bill count, low stock alerts
- Duplicate-product protection

## Prerequisites
1. **Node.js** (v18+) — https://nodejs.org
2. A code editor — VS Code recommended
3. Internet connection (needed once, to download packages)

Check Node is installed:
```
node -v
npm -v
```

---

## STEP 1: Backend setup

```bash
cd backend
npm install
```

If npm warns about pending install scripts (common with Prisma), approve them:
```bash
npm approve-scripts --allow-scripts-pending
```
(If that doesn't work, approve each package individually: `npm approve-scripts @prisma/client`, etc., then `npm rebuild`.)

Create your `.env` file:
```bash
copy .env.example .env      # Windows
cp .env.example .env        # Mac/Linux
```
Open `.env` and change `JWT_SECRET` to any random long string.

Create the database:
```bash
npx prisma migrate dev --name init
```

Start the backend:
```bash
npm run dev
```
You should see: `Server running on http://localhost:5000`. Leave this terminal open.

---

## STEP 2: Frontend setup

Open a **new terminal**:
```bash
cd frontend
npm install
npm run dev
```
Open the printed `http://localhost:5173` URL in your browser.

---

## STEP 3: Using the app

1. **Sign up** — creates your shop account
2. **Settings** — set your shop phone number, GST number, invoice prefix, and add categories that fit your shop (e.g. a clothing shop: Kids, Mens, Womens)
3. **Suppliers** — add your suppliers
4. **Purchases** — record stock coming in from a supplier (this is how stock quantities go up)
5. **Products** — add products, assign a category, set price/GST%/low-stock threshold
6. **New Bill** — search or filter by category, add to cart, optionally add a customer, choose payment mode (Cash/UPI/Credit), generate + print
7. **Customer Khata** — see who owes money and record payments as they come in
8. **Bill History** — reopen and reprint any past invoice

---

## STEP 4: Phone access (same wifi)

1. Find your laptop's local IP: `ipconfig` (Windows) → look for IPv4 Address
2. In `frontend/src/api.js`, change `API_BASE_URL` to `http://<your-ip>:5000/api`
3. On your phone (same wifi), open `http://<your-ip>:5173`

---

## What's next (not built yet — future phases)

- **MySQL/PostgreSQL migration** — needed before real multi-device production use; SQLite is a single file, fine for development/testing only
- **PDF invoice download + WhatsApp share**
- **Barcode scanning**
- **PWA conversion + Play Store packaging**
- **Cloud deployment** (Render/Railway for backend, Vercel/Netlify for frontend)

## Project structure
```
paint-billing-app/
  backend/
    prisma/schema.prisma     <- all database tables
    src/
      routes/
        auth.js              <- signup/login/shop settings
        products.js          <- inventory CRUD
        categories.js        <- custom category management
        bills.js             <- core billing logic (GST, stock, invoice numbers)
        customers.js         <- Khata (credit/due tracking)
        suppliers.js         <- supplier CRUD
        purchases.js         <- stock-in recording
      middleware/auth.js      <- login protection
      server.js                <- entry point
  frontend/
    src/
      pages/
        Login.jsx, Signup.jsx
        Dashboard.jsx
        Products.jsx
        Billing.jsx           <- main POS screen
        BillHistory.jsx
        InvoiceView.jsx       <- printable invoice
        Settings.jsx          <- shop profile + categories
        Customers.jsx         <- Khata page
        Suppliers.jsx
        Purchases.jsx
      App.jsx                 <- routing + sidebar nav
      api.js                  <- backend connection
```

