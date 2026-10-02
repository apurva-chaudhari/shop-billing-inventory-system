import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  IndianRupee,
  ShoppingCart,
  AlertTriangle,
  Receipt,
  Sparkles,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  ArrowUpRight,
  Package,
} from "lucide-react";
import api from "../api";

const CHART_COLORS = ["#245D53", "#4FA391", "#B4790F", "#3E7CB1", "#8C5FBC", "#B3402E", "#4B5B58"];

function formatMoney(n) {
  return `₹${(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function buildInsight(weeklySales, topProducts) {
  if (!weeklySales || weeklySales.length < 2) return null;

  const last = weeklySales[weeklySales.length - 1].total;
  const prevAvg =
    weeklySales.slice(0, -1).reduce((s, d) => s + d.total, 0) /
    Math.max(weeklySales.length - 1, 1);

  let trendText = "Sales have been steady this week.";
  let trendUp = true;

  if (prevAvg > 0) {
    const changePct = ((last - prevAvg) / prevAvg) * 100;
    if (changePct > 8) {
      trendText = `Today's sales are ${changePct.toFixed(0)}% above your recent daily average.`;
      trendUp = true;
    } else if (changePct < -8) {
      trendText = `Today's sales are ${Math.abs(changePct).toFixed(0)}% below your recent daily average.`;
      trendUp = false;
    }
  }

  const topProduct = topProducts && topProducts[0];
  const productText = topProduct
    ? ` ${topProduct.name} is your top seller this period, bringing in ${formatMoney(topProduct.revenue)}.`
    : "";

  return { text: trendText + productText, trendUp };
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const shopName = localStorage.getItem("shopName") || "Your Shop";

  useEffect(() => {
    api
      .get("/bills/reports/analytics")
      .then((res) => setData(res.data))
      .catch(() => setError("Couldn't load analytics right now."));
  }, []);

  const insight = useMemo(
    () => (data ? buildInsight(data.weeklySales, data.topProducts) : null),
    [data]
  );

  if (error) return <div className="dashboard-state dashboard-error">{error}</div>;
  if (!data) return <div className="dashboard-state">Loading dashboard...</div>;

  const cards = [
    {
      label: "Today's Sales",
      value: formatMoney(data.todaysSales),
      icon: IndianRupee,
      tone: "green",
      helper: "Revenue generated today",
    },
    {
      label: "Total Orders",
      value: data.todaysOrders,
      icon: ShoppingCart,
      tone: "blue",
      helper: "Bills created today",
    },
    {
      label: "Low Stock Items",
      value: data.lowStockCount,
      icon: AlertTriangle,
      tone: "amber",
      helper: "Need stock attention",
    },
    {
      label: "GST Collected",
      value: formatMoney(data.gstCollectedToday),
      icon: Receipt,
      tone: "purple",
      helper: "GST collected today",
    },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <div>
          
          <h1 className="dashboard-title">Good morning, {shopName}</h1>
          <p className="dashboard-subtitle">
            Track today's sales, inventory signals and recent business activity.
          </p>
        </div>
        <div className="dashboard-date">
          <CalendarDays size={16} />
          <span>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
      </div>

      <div className="dashboard-stat-grid">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div className="dashboard-stat-card" key={c.label}>
              <div className={`dashboard-stat-icon ${c.tone}`}>
                <Icon size={19} strokeWidth={2.2} />
              </div>
              <div className="dashboard-stat-label">{c.label}</div>
              <div className="dashboard-stat-value">{c.value}</div>
              <div className="dashboard-stat-helper">{c.helper}</div>
            </div>
          );
        })}
      </div>

      {insight && (
        <div className="dashboard-insight">
          <div className="dashboard-insight-icon"><Sparkles size={17} /></div>
          <div className="dashboard-insight-content">
            <div className="dashboard-insight-title">
              Smart Insight
              {insight.trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            </div>
            <div className="dashboard-insight-text">{insight.text}</div>
          </div>
          <div className="dashboard-insight-badge">Live data</div>
        </div>
      )}

      <div className="dashboard-section-heading">
        <div>
          <h2>Sales performance</h2>
          <p>Understand how your shop is performing over time.</p>
        </div>
      </div>

      <div className="dashboard-chart-grid">
        <div className="dashboard-chart-card dashboard-chart-wide">
          <div className="dashboard-chart-head">
            <div>
              <h3>Weekly Sales</h3>
              <span>Daily revenue for the current period</span>
            </div>
            <div className="dashboard-chart-icon"><TrendingUp size={16} /></div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.weeklySales} margin={{ top: 14, right: 10, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="weeklyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#245D53" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#245D53" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B7976" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7976" }} axisLine={false} tickLine={false} width={52} />
              <Tooltip formatter={(v) => formatMoney(v)} />
              <Area type="monotone" dataKey="total" stroke="#245D53" strokeWidth={2.5} fill="url(#weeklyFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-chart-card">
          <div className="dashboard-chart-head">
            <div>
              <h3>Monthly Revenue</h3>
              <span>Revenue by month</span>
            </div>
            <div className="dashboard-chart-icon blue"><ArrowUpRight size={16} /></div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.monthlyRevenue} margin={{ top: 14, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B7976" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7976" }} axisLine={false} tickLine={false} width={52} />
              <Tooltip formatter={(v) => formatMoney(v)} />
              <Bar dataKey="total" fill="#3E7CB1" radius={[7, 7, 0, 0]} maxBarSize={38} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-chart-card">
          <div className="dashboard-chart-head">
            <div>
              <h3>Top Products</h3>
              <span>Best-performing products</span>
            </div>
            <div className="dashboard-chart-icon amber"><Package size={16} /></div>
          </div>
          {data.topProducts.length === 0 ? (
            <div className="dashboard-empty">No sales yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.topProducts} layout="vertical" margin={{ top: 10, right: 18, left: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7976" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#4B5B58" }} axisLine={false} tickLine={false} width={105} />
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Bar dataKey="revenue" fill="#245D53" radius={[0, 7, 7, 0]} maxBarSize={21} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="dashboard-chart-card">
          <div className="dashboard-chart-head">
            <div>
              <h3>Category Sales</h3>
              <span>Sales distribution by category</span>
            </div>
            <div className="dashboard-chart-icon purple"><Receipt size={16} /></div>
          </div>
          {data.categoryWiseSales.length === 0 ? (
            <div className="dashboard-empty">No sales yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.categoryWiseSales} dataKey="total" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={2}>
                  {data.categoryWiseSales.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11.5 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
