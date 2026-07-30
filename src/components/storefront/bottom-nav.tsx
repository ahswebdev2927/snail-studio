"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Heart, ShoppingBag, User } from "lucide-react";
import { useCartStore } from "@/lib/hooks/use-cart-store";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/features/account/actions";

export function BottomNav() {
  const pathname = usePathname();
  const wishlist = useCartStore((state) => state.wishlist);
  const cart = useCartStore((state) => state.cart);
  const setCartOpen = useCartStore((state) => state.setCartOpen);
  const [currentUser, setCurrentUser] = React.useState<any>(null);

  React.useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (err) {
        console.error("Failed to load user in bottom nav:", err);
      }
    }
    loadUser();
  }, [pathname]);

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const navItems = [
    {
      label: "Home",
      icon: Home,
      href: "/",
      isActive: pathname === "/",
    },
    {
      label: "Shop",
      icon: Compass,
      href: "/shop",
      isActive: pathname === "/shop" || pathname.startsWith("/shop"),
    },
    {
      label: "Wishlist",
      icon: Heart,
      href: "/wishlist",
      isActive: pathname === "/wishlist",
      badge: wishlist.length > 0 ? wishlist.length : undefined,
    },
    {
      label: "Cart",
      icon: ShoppingBag,
      onClick: () => setCartOpen(true),
      isActive: false,
      badge: cartItemsCount > 0 ? cartItemsCount : undefined,
    },
    {
      label: currentUser ? "Account" : "Login/Sign Up",
      icon: User,
      href: "/account",
      isActive: pathname.startsWith("/account"),
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-background dark:bg-card border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.08)] z-40 md:hidden flex items-center justify-around px-4 pb-safe">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.isActive;
        const baseClasses = cn(
          "flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-200 cursor-pointer relative",
          active 
            ? "text-primary scale-105" 
            : "text-muted-foreground hover:text-primary"
        );

        const content = (
          <>
            <div className="relative">
              <Icon className="w-5 h-5 stroke-[2]" />
              {item.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2.5 bg-primary text-white text-[9px] font-bold min-w-[15px] h-[15px] rounded-full flex items-center justify-center px-1 font-sans">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium tracking-wide">
              {item.label}
            </span>
          </>
        );

        if (item.onClick) {
          return (
            <button
              key={item.label}
              onClick={item.onClick}
              className={baseClasses}
              type="button"
            >
              {content}
            </button>
          );
        }

        return (
          <Link key={item.label} prefetch={true} href={item.href || "/"} className={baseClasses}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
