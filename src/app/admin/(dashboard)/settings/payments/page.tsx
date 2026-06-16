import React from "react";
import { CreditCard, Save } from "lucide-react";

export default function AdminPaymentsSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">Payment Gateway Settings</h1>
          <p className="text-xs text-muted-foreground font-light">
            Toggle the mock gateway settings and secure production Stripe/Razorpay keys.
          </p>
        </div>
        <div>
          <button className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer">
            <Save className="w-4 h-4" />
            Save Keys
          </button>
        </div>
      </div>

      <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-6 max-w-3xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 bg-secondary/35 dark:bg-secondary/15 rounded-2xl border border-border/40">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground">Active Payment Gateway</span>
              <p className="text-[10px] text-muted-foreground font-light">Choose which backend integration manages payments.</p>
            </div>
            <select className="px-3.5 py-2 bg-card border border-border rounded-xl text-xs font-medium outline-none text-foreground">
              <option value="mock" className="bg-card text-foreground">Mock Developer Gateway</option>
              <option value="razorpay" className="bg-card text-foreground">Razorpay Gateway</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Razorpay Key ID</label>
              <input type="text" placeholder="rzp_test_..." className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Razorpay Secret Key</label>
              <input type="password" placeholder="••••••••••••" className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
