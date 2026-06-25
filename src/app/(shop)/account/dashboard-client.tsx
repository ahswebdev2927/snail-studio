"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateDemoOrder } from "@/features/account/actions";

export function DashboardClient({ initialOrdersCount }: { initialOrdersCount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleGenerateOrder = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await generateDemoOrder();
      if (res.success) {
        setStatus({
          type: "success",
          message: `Successfully generated test order ${res.orderId}! Reloading dashboard...`
        });
        setTimeout(() => {
          router.refresh();
          setStatus(null);
        }, 1500);
      } else {
        setStatus({
          type: "error",
          message: res.error || "Failed to create mock order."
        });
      }
    } catch (err: any) {
      console.error(err);
      setStatus({
        type: "error",
        message: "An unexpected error occurred while generating order."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {status && (
        <div className={`p-4 border rounded-2xl flex items-start gap-2.5 text-xs transition-all ${
          status.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" 
            : "bg-destructive/10 border-destructive/20 text-destructive"
        }`}>
          {status.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      {initialOrdersCount === 0 && (
        <div className="bg-secondary/25 border border-border/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 justify-center sm:justify-start">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Dev Tool: Populate Test Order
            </h4>
            <p className="text-[11px] text-muted-foreground font-light">
              This account doesn't have any orders yet. Click below to instantly generate a mock order to verify dashboard layout styling.
            </p>
          </div>
          <Button
            onClick={handleGenerateOrder}
            disabled={loading}
            variant="outline"
            className="text-xs uppercase tracking-wider font-semibold border-primary/20 hover:bg-primary hover:text-primary-foreground shrink-0 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Generate Demo Order
              </>
            )}
          </Button>
        </div>
      )}

      {initialOrdersCount > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleGenerateOrder}
            disabled={loading}
            className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-primary hover:text-accent disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 animate-spin mr-1" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 mr-0.5" />
                Add Another Test Order
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
