"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  Search, 
  X, 
  Loader2, 
  Phone, 
  Mail, 
  DollarSign,
  TrendingUp,
  Award,
  MessageSquare,
  ChevronRight
} from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";

interface CustomerListItem {
  id: string;
  name: string | null;
  phoneNumber: string;
  whatsappNumber: string | null;
  email: string | null;
  image: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  totalOrders: number;
  totalSpent: number;
}

const SEGMENT_TABS = [
  { name: "All Customers", value: "" },
  { name: "VIP Customers", value: "VIP Customers" },
  { name: "Frequent Buyers", value: "Frequent Buyers" },
  { name: "One-Time Buyers", value: "One-Time Buyers" },
  { name: "Cart Abandoners", value: "Cart Abandoners" },
  { name: "Wishlist Heavy Users", value: "Wishlist Heavy Users" },
  { name: "High Lifetime Value", value: "High Lifetime Value" },
  { name: "New Customers", value: "New Customers" },
  { name: "Inactive Customers", value: "Inactive Customers" }
];

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [segmentCounts, setSegmentCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Parse initial query params on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const search = params.get("search") || params.get("q") || "";
      const segment = params.get("segment") || "";
      if (search) {
        setSearchQuery(search);
      }
      if (segment) {
        setSelectedSegment(segment);
      }
    }
  }, []);

  // Sync active segment to URL query params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (selectedSegment) {
        params.set("segment", selectedSegment);
      } else {
        params.delete("segment");
      }
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}?${params.toString()}`
      );
    }
  }, [selectedSegment]);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (debouncedSearchQuery.trim()) query.set("q", debouncedSearchQuery.trim());
      if (selectedSegment) query.set("segment", selectedSegment);

      const res = await fetch(`/api/admin/customers?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        if (data.segmentCounts) {
          setSegmentCounts(data.segmentCounts);
        }
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [debouncedSearchQuery, selectedSegment]);

  // Format currency helpers
  const formatPrice = (priceInPaise: number) => {
    return `₹${(priceInPaise / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // Compute CRM Aggregates
  const totalCustomersCount = customers.length;
  const activeCustomersCount = customers.filter(c => c.totalOrders > 0).length;
  const totalLTV = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgSpent = totalCustomersCount > 0 ? totalLTV / totalCustomersCount : 0;

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl relative overflow-hidden transition-all duration-300">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none rounded-r-3xl" />
        <div className="space-y-1 relative z-10">
          <h1 className="font-serif text-2xl font-normal text-foreground">Customer CRM</h1>
          <p className="text-xs text-muted-foreground font-light">
            Monitor client shopper registrations, lifetime orders, behavioral segmentations, and user profiles.
          </p>
        </div>
      </div>

      {/* CRM Aggregates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Displayed</span>
            <p className="font-serif text-xl font-semibold text-foreground">{totalCustomersCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Buyers</span>
            <p className="font-serif text-xl font-semibold text-foreground">{activeCustomersCount} users</p>
          </div>
          <div className="p-3 rounded-2xl bg-accent/10 text-accent">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Segment Value</span>
            <p className="font-serif text-xl font-semibold text-foreground">{formatPrice(totalLTV)}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Avg. Spent / User</span>
            <p className="font-serif text-xl font-semibold text-foreground">{formatPrice(avgSpent)}</p>
          </div>
          <div className="p-3 rounded-2xl bg-secondary text-secondary-foreground">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Query Filter and Segment Dropdown */}
      <div className="bg-card border border-border/30 rounded-3xl p-5">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by customer name, phone, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-secondary/30 border border-border/50 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap">Filter Segment:</span>
            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="bg-secondary/40 border border-border/40 focus:border-primary focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground cursor-pointer"
            >
              {(() => {
                const totalRegisterCount = Object.values(segmentCounts).reduce((a, b) => Math.max(a, b), 0) || customers.length;
                return SEGMENT_TABS.map((seg) => {
                  const count = seg.value === "" 
                    ? (segmentCounts["All Customers"] || totalRegisterCount) 
                    : (segmentCounts[seg.value] || 0);
                  return (
                    <option key={seg.name} value={seg.value}>
                      {seg.name} ({count})
                    </option>
                  );
                });
              })()}
            </select>
          </div>
        </div>
      </div>

      {/* CRM Users Table Grid */}
      <div className="bg-card border border-border/40 rounded-3xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-xs font-light">Loading customer register...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-24 text-center flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-primary/10 text-primary rounded-full">
              <Users className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h3 className="text-sm font-semibold tracking-wide">No Shoppers Found</h3>
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                We couldn't find any shopper registrations in the system matching that search criteria or segment.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-light border-collapse">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground uppercase text-[9px] font-bold tracking-wider bg-secondary/10">
                  <th className="py-3 px-5">Shopper Profile</th>
                  <th className="py-3 px-5">Contact Details</th>
                  <th className="py-3 px-5">WhatsApp</th>
                  <th className="py-3 px-5">Joined Date</th>
                  <th className="py-3 px-5">Orders</th>
                  <th className="py-3 px-5">Lifetime Value (Spent)</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const customerInitials = c.name
                    ? c.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
                    : "S";

                  return (
                    <tr 
                      key={c.id} 
                      className="border-b border-border/10 last:border-0 hover:bg-secondary/15 transition-all"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          {c.image ? (
                            <img 
                              src={c.image} 
                              alt={c.name || "Customer"} 
                              className="w-8 h-8 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[10px] font-bold">
                              {customerInitials}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{c.name || "Guest Customer"}</span>
                            <span className="text-[9px] font-mono text-muted-foreground">ID: {c.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex flex-col space-y-0.5 text-xs text-foreground">
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            {c.phoneNumber}
                          </span>
                          {c.email && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              {c.email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5 font-mono text-xs">
                        {c.whatsappNumber ? (
                          <span className="inline-flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[9px] font-bold">
                            <MessageSquare className="w-3 h-3" />
                            {c.whatsappNumber}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Not linked</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-muted-foreground">{formatDate(c.createdAt)}</td>
                      <td className="py-4 px-5 font-medium text-foreground text-center sm:text-left pl-8">{c.totalOrders}</td>
                      <td className="py-4 px-5 font-semibold text-foreground">{formatPrice(c.totalSpent)}</td>
                      <td className="py-4 px-5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider inline-block ${
                          c.isActive
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                        }`}>
                          {c.isActive ? "Active" : "Banned"}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-foreground hover:bg-primary px-3 py-1.5 rounded-full border border-primary/20 hover:border-primary transition-all cursor-pointer"
                        >
                          Profile
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
