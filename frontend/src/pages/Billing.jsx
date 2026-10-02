import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Banknote,
  Check,
  CreditCard,
  Mic,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Smartphone,
  Trash2,
  User,
  X,
} from "lucide-react";
import api from "../api";

// ---------- Voice billing helpers ----------

const NUMBER_WORDS = {
  zero: 0, a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
};

const FILLER_WORDS = new Set(["add", "also", "plus", "and", "then", "me", "please", "some", "of"]);

function parseVoiceSegment(segment) {
  const words = segment.trim().split(/\s+/).filter(Boolean);

  while (words.length && FILLER_WORDS.has(words[0].toLowerCase())) words.shift();
  if (!words.length) return null;

  let qty = 1;
  const first = words[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  if (/^\d+$/.test(first)) {
    qty = parseInt(first, 10);
    words.shift();
  } else if (first in NUMBER_WORDS) {
    qty = NUMBER_WORDS[first];
    words.shift();
  }

  while (words.length && FILLER_WORDS.has(words[0].toLowerCase())) words.shift();

  const name = words.join(" ").trim();
  if (!name || qty <= 0) return null;
  return { qty, name };
}

function parseVoiceCommand(transcript) {
  return transcript
    .split(/,|\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseVoiceSegment)
    .filter(Boolean);
}

function normalizeWords(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w));
}

function matchProduct(spokenName, products) {
  const spokenWords = normalizeWords(spokenName);
  if (!spokenWords.length) return null;
  const spokenNorm = spokenWords.join(" ");

  let best = null;
  let bestScore = 0;

  for (const p of products) {
    const productWords = normalizeWords(p.name);
    const productNorm = productWords.join(" ");

    let score = 0;
    if (productNorm === spokenNorm) score = 1;
    else if (productNorm.includes(spokenNorm) || spokenNorm.includes(productNorm)) score = 0.85;
    else {
      const common = spokenWords.filter((w) => productWords.includes(w));
      score = common.length / Math.max(spokenWords.length, productWords.length);
    }

    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  return bestScore >= 0.4 ? best : null;
}

const SpeechRecognitionAPI =
  typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

export default function Billing() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [unmatchedItems, setUnmatchedItems] = useState([]);
  const [voiceError, setVoiceError] = useState("");
  const navigate = useNavigate();

  const productsRef = useRef([]);
  const recognitionRef = useRef(null);

  useEffect(() => {
    api.get("/products").then((res) => setProducts(res.data));
    api.get("/categories").then((res) => setCategories(res.data));
  }, []);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  function addItemsByQuantity(items) {
    const unmatched = [];
    setCart((prevCart) => {
      let nextCart = prevCart;
      for (const { qty, name } of items) {
        const product = matchProduct(name, productsRef.current);
        if (!product) {
          unmatched.push(name);
          continue;
        }
        const existing = nextCart.find((c) => c.productId === product.id);
        if (existing) {
          nextCart = nextCart.map((c) =>
            c.productId === product.id ? { ...c, quantity: c.quantity + qty } : c
          );
        } else {
          nextCart = [
            ...nextCart,
            {
              productId: product.id,
              name: product.name,
              price: product.price,
              gstPercent: product.gstPercent,
              unit: product.unit,
              quantity: qty,
            },
          ];
        }
      }
      return nextCart;
    });
    setUnmatchedItems(unmatched);
  }

  function processVoiceCommand(transcript) {
    setLastTranscript(transcript);
    const items = parseVoiceCommand(transcript);
    if (items.length === 0) {
      setUnmatchedItems([]);
      setVoiceError('Couldn\'t understand that. Try "add two notebooks and one pen".');
      return;
    }
    setVoiceError("");
    addItemsByQuantity(items);
  }

  function toggleVoiceListening() {
    if (!SpeechRecognitionAPI) return;

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    setVoiceError("");
    setUnmatchedItems([]);

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      processVoiceCommand(transcript);
    };
    recognition.onerror = () => setVoiceError("Didn't catch that. Please try again.");
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "all" || p.categoryId === activeCategory;
    return matchesSearch && matchesCategory;
  });

  function addToCart(product) {
    const existing = cart.find((c) => c.productId === product.id);
    if (existing) {
      setCart(cart.map((c) =>
        c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        price: product.price,
        gstPercent: product.gstPercent,
        unit: product.unit,
        quantity: 1,
      }]);
    }
  }

  function updateQty(productId, qty) {
    const value = parseFloat(qty);
    if (value <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map((c) => (c.productId === productId ? { ...c, quantity: value } : c)));
  }

  function removeFromCart(productId) {
    setCart(cart.filter((c) => c.productId !== productId));
  }

  const subTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const gstTotal = cart.reduce((sum, c) => sum + (c.price * c.quantity * (c.gstPercent || 0)) / 100, 0);
  const total = subTotal + gstTotal;
  const itemCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const dueAmount = Math.max(total - (paidAmount === "" ? (paymentMode === "credit" ? 0 : total) : parseFloat(paidAmount) || 0), 0);

  async function handleCheckout() {
    if (cart.length === 0) return alert("Cart is empty");

    let finalPaidAmount;
    if (paidAmount !== "") finalPaidAmount = parseFloat(paidAmount);
    else finalPaidAmount = paymentMode === "credit" ? 0 : total;

    if (paymentMode === "credit" && !customerName.trim()) {
      return alert("Credit billing requires a customer name so the due amount can be tracked.");
    }

    try {
      const res = await api.post("/bills", {
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        paidAmount: finalPaidAmount,
        paymentMode,
      });
      navigate(`/invoice/${res.data.id}`);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create bill");
    }
  }

  const paymentOptions = [
    { value: "cash", label: "Cash", icon: Banknote },
    { value: "upi", label: "UPI", icon: Smartphone },
    { value: "credit", label: "Credit", icon: CreditCard },
  ];

  return (
    <div className="billing-page">
      <div className="billing-header">
        <div>
          <div className="billing-eyebrow"><Receipt size={15} /> SALES</div>
          <h1 className="billing-title">Create new bill</h1>
          <p className="billing-subtitle">Add products, customer details and complete the payment.</p>
        </div>
        <div className="billing-summary-pill">
          <ShoppingCart size={17} />
          <span>{itemCount} {itemCount === 1 ? "item" : "items"}</span>
          <strong>₹{total.toFixed(2)}</strong>
        </div>
      </div>

      <div className="billing-layout">
        <section className="billing-products-panel">
          <div className="billing-toolbar">
            <div className="billing-search-wrap">
              <Search size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
              />
              {search && (
                <button className="billing-clear-search" onClick={() => setSearch("")} aria-label="Clear search">
                  <X size={15} />
                </button>
              )}
            </div>

            {SpeechRecognitionAPI && (
              <button
                type="button"
                className={`voice-billing-btn ${isListening ? "listening" : ""}`}
                onClick={toggleVoiceListening}
              >
                <Mic size={18} />
                {isListening ? "Listening..." : "Voice add"}
              </button>
            )}
          </div>

          {isListening && (
            <div className="voice-live-banner">
              <span className="voice-pulse"><Mic size={17} /></span>
              <div>
                <strong>Listening for products</strong>
                <small>Try: “add two notebooks and one pen”</small>
              </div>
            </div>
          )}

          {!SpeechRecognitionAPI && (
            <div className="billing-alert info">Voice billing isn't supported in this browser. Try Chrome or Edge.</div>
          )}

          {lastTranscript && (
            <div className="voice-result">
              <span>Heard</span> “{lastTranscript}”
            </div>
          )}
          {voiceError && <div className="billing-alert warning">{voiceError}</div>}
          {unmatchedItems.length > 0 && (
            <div className="billing-alert warning">Couldn't find in catalog: {unmatchedItems.join(", ")}</div>
          )}

          <div className="billing-section-heading">
            <div>
              <h2>Products</h2>
              <span>{filtered.length} products available</span>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="billing-category-list">
              <button
                className={`category-chip ${activeCategory === "all" ? "active" : ""}`}
                onClick={() => setActiveCategory("all")}
              >
                All products
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={`category-chip ${activeCategory === c.id ? "active" : ""}`}
                  onClick={() => setActiveCategory(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <div className="billing-product-grid">
            {filtered.map((p) => (
              <article className="billing-product-card" key={p.id}>
                <div className="billing-product-topline">
                  <span className="billing-product-icon"><ShoppingCart size={17} /></span>
                  <span className={`stock-pill ${p.stockQty > 0 ? "in-stock" : "out-stock"}`}>
                    {p.stockQty > 0 ? `${p.stockQty} in stock` : "Out of stock"}
                  </span>
                </div>
                <h3 title={p.name}>{p.name}</h3>
                <div className="billing-product-price">₹{Number(p.price).toFixed(2)} <span>/ {p.unit}</span></div>
                <button
                  className="add-product-btn"
                  onClick={() => addToCart(p)}
                  disabled={Number(p.stockQty) <= 0}
                >
                  <Plus size={16} /> Add to bill
                </button>
              </article>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="billing-empty-products">
              <Search size={28} />
              <strong>No products found</strong>
              <span>Try another search or category.</span>
            </div>
          )}
        </section>

        <aside className="billing-checkout-panel">
          <div className="checkout-heading">
            <div>
              <span className="checkout-kicker">CURRENT BILL</span>
              <h2>Your cart</h2>
            </div>
            <span className="cart-count">{itemCount}</span>
          </div>

          <div className="billing-cart-list">
            {cart.length === 0 ? (
              <div className="billing-empty-cart">
                <div className="empty-cart-icon"><ShoppingCart size={24} /></div>
                <strong>Your cart is empty</strong>
                <span>Add products from the left to start a bill.</span>
              </div>
            ) : (
              cart.map((c) => (
                <div key={c.productId} className="billing-cart-item">
                  <div className="billing-cart-item-main">
                    <strong>{c.name}</strong>
                    <span>₹{Number(c.price).toFixed(2)} / {c.unit}</span>
                  </div>
                  <div className="billing-cart-controls">
                    <button onClick={() => updateQty(c.productId, c.quantity - 1)} aria-label={`Decrease ${c.name}`}>
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min="0.01"
                      value={c.quantity}
                      onChange={(e) => updateQty(c.productId, e.target.value)}
                      aria-label={`Quantity for ${c.name}`}
                    />
                    <button onClick={() => updateQty(c.productId, c.quantity + 1)} aria-label={`Increase ${c.name}`}>
                      <Plus size={14} />
                    </button>
                    <button className="remove-cart-item" onClick={() => removeFromCart(c.productId)} aria-label={`Remove ${c.name}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <strong className="billing-line-total">₹{(c.price * c.quantity).toFixed(2)}</strong>
                </div>
              ))
            )}
          </div>

          <div className="billing-totals">
            <div><span>Subtotal</span><strong>₹{subTotal.toFixed(2)}</strong></div>
            <div><span>GST</span><strong>₹{gstTotal.toFixed(2)}</strong></div>
            <div className="grand-total"><span>Grand total</span><strong>₹{total.toFixed(2)}</strong></div>
          </div>

          <div className="checkout-form">
            <div className="checkout-form-title"><User size={16} /> Customer details</div>
            <div className="checkout-two-col">
              <input
                className="billing-input"
                placeholder="Customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <input
                className="billing-input"
                placeholder="Phone number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>

            <div className="checkout-form-title payment-title"><CreditCard size={16} /> Payment method</div>
            <div className="payment-options">
              {paymentOptions.map(({ value, label, icon: Icon }) => (
                <button
                  type="button"
                  key={value}
                  className={`payment-option ${paymentMode === value ? "active" : ""}`}
                  onClick={() => setPaymentMode(value)}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                  {paymentMode === value && <Check size={15} className="payment-check" />}
                </button>
              ))}
            </div>

            <input
              className="billing-input paid-input"
              type="number"
              min="0"
              placeholder="Amount paid (default = full total)"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
            />

            {(paidAmount !== "" || paymentMode === "credit") && (
              <div className="amount-due-row">
                <span>Amount due</span>
                <strong>₹{dueAmount.toFixed(2)}</strong>
              </div>
            )}

            <button className="generate-bill-btn" onClick={handleCheckout} disabled={cart.length === 0}>
              <Receipt size={18} />
              Generate bill & print
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
