import React from "react";
import { Ticket, Plus } from "lucide-react";

export default function AdminCouponsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">Discount & Coupon Management</h1>
          <p className="text-xs text-muted-foreground font-light">
            Configure complex discount rules, coupon expiration, and usage limits.
          </p>
        </div>
        <div>
          <button className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer">
            <Plus className="w-4 h-4" />
            Create Coupon
          </button>
        </div>
      </div>

      <div className="bg-card border border-border/40 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-accent/10 text-accent rounded-full">
          <Ticket className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h3 className="text-sm font-semibold tracking-wide">Promotional Campaign Engine</h3>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            Create percentage discounts, fixed-value reductions, free shipping offers, and custom user rules easily.
          </p>
        </div>
      </div>
    </div>
  );
}
