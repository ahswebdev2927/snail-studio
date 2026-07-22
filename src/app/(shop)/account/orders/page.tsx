import React from "react";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ShoppingBag, ArrowLeft, ChevronRight, Calendar, ArrowRight } from "lucide-react";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";
import { formatPrice } from "@/lib/utils";

export const metadata = {
  title: "Order History | Snail Studio",
  description: "View and track your previous press-on nails orders at Snail Studio.",
};

export default async function OrderHistoryPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    redirect("/login?callbackUrl=/account/orders");
  }

  const user = await getSessionUser(token);

  if (!user) {
    redirect("/login?callbackUrl=/account/orders");
  }

  // Fetch all orders placed by the user
  const userOrders = await db.query.orders.findMany({
    where: eq(orders.userId, user.id),
    orderBy: [desc(orders.createdAt)],
    with: {
      items: {
        with: {
          variant: {
            with: {
              product: {
                with: {
                  media: {
                    with: {
                      media: true,
                    },
                    orderBy: (pm, { asc }) => [asc(pm.sortOrder)],
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-success/15 text-success border border-success/30";
      case "processing":
      case "paid":
      case "pending":
        return "bg-warning/15 text-warning border border-warning/30";
      case "cancelled":
      case "refunded":
        return "bg-rose-500/10 text-rose-700 border border-rose-500/20 dark:text-rose-400";
      default:
        return "bg-secondary text-muted-foreground border border-border/40";
    }
  };

  return (
    <div className="space-y-8 w-full font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              href="/account"
              scroll={false}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors md:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="font-serif text-2xl font-semibold text-foreground tracking-wide">
              Order History
            </h1>
          </div>
          <p className="text-xs text-muted-foreground font-light">
            Manage and track all your Snail Studio order shipments.
          </p>
        </div>
        <div className="text-xs bg-secondary/40 border border-border/30 px-3.5 py-1.5 rounded-full text-muted-foreground font-medium self-start sm:self-auto">
          Total Orders: <span className="font-bold text-foreground">{userOrders.length}</span>
        </div>
      </div>

      {/* Orders List */}
      {userOrders.length === 0 ? (
        <div className="py-16 text-center space-y-5">
          <div className="inline-flex p-4.5 bg-secondary/35 text-muted-foreground/60 rounded-full border border-border/30">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <div className="space-y-1.5 max-w-xs mx-auto">
            <h3 className="font-serif text-base font-semibold text-foreground">No orders placed yet</h3>
            <p className="text-xs text-muted-foreground font-light leading-relaxed">
              Looks like you haven't made a purchase yet. Explore our luxury handcrafted press-on collections to get started!
            </p>
          </div>
          <Link 
            href="/shop"
            className="inline-flex justify-center items-center px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/10 cursor-pointer"
          >
            Explore Collections
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {userOrders.map((order) => {
            // Count total item count
            const totalItemsQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <div 
                key={order.id}
                className="bg-card border border-border/30 rounded-2xl overflow-hidden hover:border-primary/20 transition-all duration-300 shadow-sm"
              >
                {/* Order Top Bar Details */}
                <div className="bg-secondary/20 px-5 py-4 border-b border-border/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4.5">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Order ID</p>
                      <p className="font-mono font-medium text-foreground">{order.id}</p>
                    </div>
                    <div className="h-6 w-[1px] bg-border/40" />
                    <div>
                      <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Placed On</p>
                      <p className="font-medium text-foreground flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                      {order.status}
                    </span>
                    <div className="text-right">
                      <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Total Amount</p>
                      <p className="font-bold text-primary">{formatPrice(order.totalAmount)}</p>
                    </div>
                  </div>
                </div>

                {/* Order Contents row */}
                <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex flex-col gap-3 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                      Items in Order ({totalItemsQuantity})
                    </span>
                    {/* Item Image row */}
                    <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                      {order.items.map((item) => {
                        let itemImageUrl = "/luxury_nails_hero.png";
                        const variantMedia = item.variant?.product?.media;
                        if (variantMedia && variantMedia.length > 0 && variantMedia[0]?.media?.url) {
                          itemImageUrl = variantMedia[0].media.url;
                        }

                        return (
                          <div 
                            key={item.id} 
                            className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-border/20 bg-secondary/15 group"
                            title={item.variant?.product?.name || "Product Item"}
                          >
                            <Image 
                              src={itemImageUrl} 
                              alt={item.variant?.product?.name || "Product Item"} 
                              fill 
                              className="object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            {item.quantity > 1 && (
                              <span className="absolute bottom-1 right-1 bg-primary text-primary-foreground text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-background">
                                {item.quantity}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
                    <Link 
                      href={`/account/orders/${order.id}`}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 border border-primary/20 hover:border-primary text-[10px] font-semibold uppercase tracking-widest text-primary hover:bg-primary/5 rounded-xl transition-all cursor-pointer text-center"
                    >
                      View Details
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
