import React from "react";
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Tag,
  Boxes,
  Compass,
  ArrowRight,
  Settings
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  // Mock data for the dashboard shell
  const stats = [
    {
      name: "Total Sales",
      value: "₹1,84,900",
      change: "+12.4%",
      changeType: "increase",
      desc: "vs last month",
      icon: TrendingUp,
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      name: "Orders Received",
      value: "148",
      change: "+8.2%",
      changeType: "increase",
      desc: "vs last month",
      icon: ShoppingBag,
      color: "text-primary bg-primary/10",
    },
    {
      name: "New Customers",
      value: "84",
      change: "+14.6%",
      changeType: "increase",
      desc: "vs last week",
      icon: Users,
      color: "text-accent bg-accent/10",
    },
    {
      name: "Low Stock Items",
      value: "4 Variants",
      change: "Action Required",
      changeType: "warn",
      desc: "under 10 units",
      icon: AlertTriangle,
      color: "text-destructive bg-destructive/10",
    },
  ];

  const recentOrders = [
    { id: "ORD-9402", customer: "Priya Sharma", date: "June 16, 2026", total: "₹2,499", status: "Paid", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { id: "ORD-9401", customer: "Anjali Patel", date: "June 15, 2026", total: "₹1,499", status: "Processing", badge: "bg-primary/10 text-primary" },
    { id: "ORD-9399", customer: "Meera Nair", date: "June 15, 2026", total: "₹3,998", status: "Shipped", badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { id: "ORD-9398", customer: "Karan Johar", date: "June 14, 2026", total: "₹2,999", status: "Delivered", badge: "bg-secondary text-secondary-foreground" },
  ];

  const lowStock = [
    { sku: "SNAIL-GLAM-M-ALM", name: "Glamour Coffin - Medium Almond", stock: 3 },
    { sku: "SNAIL-BLSH-S-SQU", name: "Blush Marble - Short Square", stock: 5 },
    { sku: "SNAIL-EMR-L-COF", name: "Emerald Gold - Long Coffin", stock: 2 },
  ];

  // Coordinates for the sales SVG path: 7 data points for 7 days
  const chartPoints = "10,140 70,120 130,90 190,110 250,50 310,70 370,20";
  // Coordinates for the gradient fill path (starts from bottom left, traces line, goes to bottom right)
  const chartFillPoints = "10,140 70,120 130,90 190,110 250,50 310,70 370,20 370,160 10,160";

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl relative overflow-hidden transition-all duration-300">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none rounded-r-3xl" />
        <div className="space-y-1 relative z-10">
          <h1 className="font-serif text-2xl font-normal text-foreground">
            Welcome Back, <span className="font-serif italic font-light text-primary">Administrator</span>
          </h1>
          <p className="text-xs text-muted-foreground font-light">
            Here is what's happening with Snail Studio today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 relative z-10">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-medium transition-all shadow-sm shadow-primary/5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Product
          </Link>
          <Link
            href="/admin/coupons"
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-secondary hover:bg-muted border border-border rounded-xl text-xs font-medium text-foreground transition-all cursor-pointer"
          >
            <Tag className="w-4 h-4 text-muted-foreground" />
            New Coupon
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground tracking-wide">
                  {stat.name}
                </span>
                <div className={`p-2.5 rounded-2xl ${stat.color} group-hover:scale-105 transition-all`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                  {stat.value}
                </p>
                <div className="flex items-center gap-1.5 text-[10px]">
                  {stat.changeType === "increase" ? (
                    <span className="inline-flex items-center text-emerald-500 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                      <ArrowUpRight className="w-3 h-3 mr-0.5" />
                      {stat.change}
                    </span>
                  ) : stat.changeType === "decrease" ? (
                    <span className="inline-flex items-center text-destructive font-medium bg-destructive/10 px-1.5 py-0.5 rounded-md">
                      <ArrowDownRight className="w-3 h-3 mr-0.5" />
                      {stat.change}
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-destructive font-semibold bg-destructive/10 px-1.5 py-0.5 rounded-md">
                      {stat.change}
                    </span>
                  )}
                  <span className="text-muted-foreground font-light">{stat.desc}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Analytics Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart Card */}
        <div className="bg-card border border-border/40 rounded-3xl p-6 lg:col-span-2 space-y-4 hover:border-primary/10 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold tracking-wide">Sales Analytics</h3>
              <p className="text-[10px] text-muted-foreground font-light">
                Revenue trends over the last 7 days.
              </p>
            </div>
            <div className="inline-flex gap-1.5 p-1 bg-secondary/50 border border-border/40 rounded-xl">
              <button className="px-3 py-1 bg-card text-[10px] font-medium rounded-lg shadow-sm">
                7 Days
              </button>
              <button className="px-3 py-1 text-muted-foreground hover:text-foreground text-[10px] font-medium rounded-lg">
                30 Days
              </button>
            </div>
          </div>

          {/* SVG Custom Area Chart */}
          <div className="h-56 w-full flex items-end pt-4">
            <svg viewBox="0 0 380 160" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.00" />
                </linearGradient>
              </defs>
              {/* Horizontal Grid lines */}
              <line x1="0" y1="20" x2="380" y2="20" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="55" x2="380" y2="55" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="90" x2="380" y2="90" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="125" x2="380" y2="125" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="160" x2="380" y2="160" stroke="var(--color-border)" strokeWidth="0.5" />

              {/* Gradient Area Fill */}
              <polygon points={chartFillPoints} fill="url(#chartGradient)" />

              {/* Line Stroke */}
              <polyline
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
                points={chartPoints}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Active data points */}
              <circle cx="10" cy="140" r="3.5" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="2" />
              <circle cx="70" cy="120" r="3.5" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="2" />
              <circle cx="130" cy="90" r="3.5" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="2" />
              <circle cx="190" cy="110" r="3.5" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="2" />
              <circle cx="250" cy="50" r="3.5" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="2" />
              <circle cx="310" cy="70" r="3.5" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="2" />
              <circle cx="370" cy="20" r="3.5" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="2" />
            </svg>
          </div>
          {/* X Axis Labels */}
          <div className="flex justify-between text-[9px] text-muted-foreground font-light px-1">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </div>

        {/* Quick Operations panel */}
        <div className="bg-card border border-border/40 rounded-3xl p-6 flex flex-col justify-between hover:border-primary/10 transition-all">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-wide">Quick Operations</h3>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/admin/products/new"
                className="p-3 bg-secondary/25 dark:bg-secondary/15 hover:bg-secondary/45 border border-border/25 rounded-2xl text-left transition-all group cursor-pointer"
              >
                <Plus className="w-4.5 h-4.5 text-primary mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-semibold block text-foreground">Add Product</span>
                <span className="text-[8px] text-muted-foreground font-light block leading-tight mt-0.5">Generate SKUs</span>
              </Link>
              <Link
                href="/admin/inventory"
                className="p-3 bg-secondary/25 dark:bg-secondary/15 hover:bg-secondary/45 border border-border/25 rounded-2xl text-left transition-all group cursor-pointer"
              >
                <Boxes className="w-4.5 h-4.5 text-accent mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-semibold block text-foreground">Adjust Stock</span>
                <span className="text-[8px] text-muted-foreground font-light block leading-tight mt-0.5">Manual logs</span>
              </Link>
              <Link
                href="/admin/collections"
                className="p-3 bg-secondary/25 dark:bg-secondary/15 hover:bg-secondary/45 border border-border/25 rounded-2xl text-left transition-all group cursor-pointer"
              >
                <Compass className="w-4.5 h-4.5 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-semibold block text-foreground">Collections</span>
                <span className="text-[8px] text-muted-foreground font-light block leading-tight mt-0.5">Rule builders</span>
              </Link>
              <Link
                href="/admin/settings/general"
                className="p-3 bg-secondary/25 dark:bg-secondary/15 hover:bg-secondary/45 border border-border/25 rounded-2xl text-left transition-all group cursor-pointer"
              >
                <Settings className="w-4.5 h-4.5 text-muted-foreground mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-semibold block text-foreground">General Setup</span>
                <span className="text-[8px] text-muted-foreground font-light block leading-tight mt-0.5">SMTP/Gateway</span>
              </Link>
            </div>
          </div>

          <div className="pt-6 border-t border-border/30 mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Low Stock Warning
              </span>
              <Link href="/admin/inventory" className="text-[9px] text-primary hover:underline font-light flex items-center">
                Manage Stock
                <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
              </Link>
            </div>
            <div className="space-y-2">
              {lowStock.map((item) => (
                <div key={item.sku} className="flex items-center justify-between text-xs font-light">
                  <span className="truncate max-w-[150px] text-foreground font-medium">
                    {item.name}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-destructive/10 text-destructive rounded-md font-semibold">
                    {item.stock} left
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4 hover:border-primary/10 transition-all">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-wide">Recent Orders</h3>
            <p className="text-[10px] text-muted-foreground font-light">
              Overview of the latest customer purchases.
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="text-[10px] text-primary hover:underline font-light flex items-center"
          >
            All Orders
            <ArrowRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-light">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground uppercase text-[9px] font-semibold tracking-wider">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Fulfillment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-border/10 last:border-0 hover:bg-secondary/15 transition-all">
                  <td className="py-3 px-4 font-mono font-medium text-foreground">{order.id}</td>
                  <td className="py-3 px-4 text-foreground">{order.customer}</td>
                  <td className="py-3 px-4 text-muted-foreground">{order.date}</td>
                  <td className="py-3 px-4 font-medium text-foreground">{order.total}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide inline-block ${order.badge}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-[10px] text-primary hover:underline font-medium"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
