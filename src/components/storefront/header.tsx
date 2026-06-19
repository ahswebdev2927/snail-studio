"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  Search,
  Heart,
  ShoppingBag,
  User,
  Sun,
  Moon,
  ChevronDown,
  Sparkles,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { useCartStore } from "@/lib/hooks/use-cart-store";
import { Drawer, DrawerHeader, DrawerTitle, DrawerBody, DrawerFooter } from "../ui/drawer";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../ui/accordion";
import { Button } from "../ui/button";

export function Header() {
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Zustand store triggers
  const cart = useCartStore((state) => state.cart);
  const wishlist = useCartStore((state) => state.wishlist);
  const setCartOpen = useCartStore((state) => state.setCartOpen);
  const setSearchOpen = useCartStore((state) => state.setSearchOpen);
  const loadPersistedData = useCartStore((state) => state.loadPersistedData);

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Sync cart and wishlist from localStorage on mount
  useEffect(() => {
    loadPersistedData();
  }, [loadPersistedData]);

  // Handle Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || localStorage.getItem("admin-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    localStorage.setItem("admin-theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleMobileNav = (url: string) => {
    setMobileMenuOpen(false);
    router.push(url);
  };

  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Left: Hamburger & Logo (Mobile) or Logo (Desktop) */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href="/" className="flex items-center gap-2">
              <span className="font-serif text-2xl font-semibold tracking-wide bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Snail Studio
              </span>
            </Link>
          </div>

          {/* Center: Desktop Mega Menu */}
          <nav className="hidden lg:flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-foreground/80">
            {/* Home */}
            <Link
              href="/"
              className="px-4 py-2.5 rounded-full hover:text-primary transition-all"
            >
              Home
            </Link>

            {/* Shop dropdown (Mega Menu) */}
            <div className="group relative py-2.5">
              <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-full hover:text-primary transition-all cursor-pointer">
                Shop
                <ChevronDown className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-200" />
              </button>

              {/* Full-width Mega Menu Dropdown */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 w-[800px] pointer-events-none opacity-0 translate-y-2 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-100">
                <div className="grid grid-cols-12 gap-8 bg-card border border-border/40 rounded-3xl p-8 shadow-2xl">
                  {/* Shapes */}
                  <div className="col-span-3 space-y-4">
                    <h4 className="font-serif text-xs font-bold text-foreground border-b border-border/10 pb-2 normal-case tracking-wider">
                      Shop by Shape
                    </h4>
                    <ul className="space-y-2 text-xs font-light text-muted-foreground normal-case tracking-normal">
                      <li>
                        <Link href="/shop?shape=Coffin" className="hover:text-primary transition-colors">
                          Coffin Shape
                        </Link>
                      </li>
                      <li>
                        <Link href="/shop?shape=Almond" className="hover:text-primary transition-colors">
                          Almond Shape
                        </Link>
                      </li>
                      <li>
                        <Link href="/shop?shape=Stiletto" className="hover:text-primary transition-colors">
                          Stiletto Shape
                        </Link>
                      </li>
                      <li>
                        <Link href="/shop?shape=Square" className="hover:text-primary transition-colors">
                          Square Shape
                        </Link>
                      </li>
                    </ul>
                  </div>

                  {/* Lengths */}
                  <div className="col-span-3 space-y-4">
                    <h4 className="font-serif text-xs font-bold text-foreground border-b border-border/10 pb-2 normal-case tracking-wider">
                      Shop by Length
                    </h4>
                    <ul className="space-y-2 text-xs font-light text-muted-foreground normal-case tracking-normal">
                      <li>
                        <Link href="/shop?length=Short" className="hover:text-primary transition-colors">
                          Short Nails
                        </Link>
                      </li>
                      <li>
                        <Link href="/shop?length=Medium" className="hover:text-primary transition-colors">
                          Medium Nails
                        </Link>
                      </li>
                      <li>
                        <Link href="/shop?length=Long" className="hover:text-primary transition-colors">
                          Long Nails
                        </Link>
                      </li>
                    </ul>
                  </div>

                  {/* Styles */}
                  <div className="col-span-3 space-y-4">
                    <h4 className="font-serif text-xs font-bold text-foreground border-b border-border/10 pb-2 normal-case tracking-wider">
                      Shop by Finish
                    </h4>
                    <ul className="space-y-2 text-xs font-light text-muted-foreground normal-case tracking-normal">
                      <li>
                        <Link href="/shop?texture=Glossy" className="hover:text-primary transition-colors">
                          Glossy / High Shine
                        </Link>
                      </li>
                      <li>
                        <Link href="/shop?texture=Matte" className="hover:text-primary transition-colors">
                          Velvety Matte
                        </Link>
                      </li>
                      <li>
                        <Link href="/shop?texture=Glitter" className="hover:text-primary transition-colors">
                          Sparkling Glitter
                        </Link>
                      </li>
                    </ul>
                  </div>

                  {/* Promotion Banner */}
                  <div className="col-span-3 bg-gradient-to-br from-secondary/50 to-primary/5 border border-border/40 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
                    <div className="space-y-1.5 z-10">
                      <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                        <Sparkles className="w-2.5 h-2.5" />
                        Trending
                      </span>
                      <h5 className="font-serif text-sm font-semibold text-foreground leading-tight">
                        Blush Quartz Collection
                      </h5>
                      <p className="text-[10px] text-muted-foreground font-light leading-relaxed normal-case tracking-normal">
                        Our bestseller marble set designed for luxury vibes.
                      </p>
                    </div>
                    <Link
                      href="/shop"
                      className="inline-flex items-center text-[10px] font-semibold text-primary uppercase tracking-widest hover:text-accent transition-colors pt-4 z-10 group"
                    >
                      Shop Now
                      <ArrowRight className="ml-1 w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <div className="absolute right-[-20px] bottom-[-20px] w-24 h-24 rounded-full bg-accent/10 blur-xl pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Catalog */}
            <Link
              href="/shop"
              className="px-4 py-2.5 rounded-full hover:text-primary transition-all"
            >
              Catalog
            </Link>

            {/* Sizing Guide */}
            <Link
              href="/sizing-guide"
              className="px-4 py-2.5 rounded-full hover:text-primary transition-all"
            >
              Sizing
            </Link>
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-300 hover:rotate-12 cursor-pointer"
              aria-label="Toggle Theme"
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Sun className="w-4 h-4 text-accent" />
              )}
            </button>

            {/* Search Trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-full text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all cursor-pointer"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Wishlist Link */}
            <Link
              href="/wishlist"
              className="p-2 rounded-full text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all relative"
              aria-label="Wishlist"
            >
              <Heart className="w-4 h-4" />
              {wishlist.length > 0 && (
                <span className="absolute top-1 right-1 bg-accent text-accent-foreground text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* Cart Trigger */}
            <button
              onClick={() => setCartOpen(true)}
              className="p-2 rounded-full text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all relative cursor-pointer"
              aria-label="Cart"
            >
              <ShoppingBag className="w-4.5 h-4.5" />
              {cartItemsCount > 0 && (
                <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse">
                  {cartItemsCount}
                </span>
              )}
            </button>

            {/* Profile / Admin Login Link */}
            <Link
              href="/admin"
              className="p-2 rounded-full text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all"
              aria-label="User Account"
            >
              <User className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer (Left Side) */}
      <Drawer isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} side="left">
        <DrawerHeader>
          <DrawerTitle className="font-serif text-xl font-semibold tracking-wide bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Snail Studio
          </DrawerTitle>
        </DrawerHeader>

        <DrawerBody className="p-0">
          <div className="px-6 py-4 flex flex-col space-y-4">
            <button
              onClick={() => handleMobileNav("/")}
              className="w-full text-left font-serif text-base text-foreground hover:text-primary transition-colors py-2 border-b border-border/10"
            >
              Home
            </button>

            <Accordion type="single" className="w-full border-none">
              <AccordionItem value="shop-menu" className="border-b border-border/10">
                <AccordionTrigger className="py-2.5 font-serif text-base hover:no-underline hover:text-primary">
                  Shop Press-Ons
                </AccordionTrigger>
                <AccordionContent className="pl-4 space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-primary block">By Shape</span>
                    <div className="grid grid-cols-2 gap-2 text-xs font-light">
                      <button onClick={() => handleMobileNav("/shop?shape=Coffin")} className="text-left py-1 hover:text-primary">Coffin</button>
                      <button onClick={() => handleMobileNav("/shop?shape=Almond")} className="text-left py-1 hover:text-primary">Almond</button>
                      <button onClick={() => handleMobileNav("/shop?shape=Stiletto")} className="text-left py-1 hover:text-primary">Stiletto</button>
                      <button onClick={() => handleMobileNav("/shop?shape=Square")} className="text-left py-1 hover:text-primary">Square</button>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-primary block">By Length</span>
                    <div className="grid grid-cols-3 gap-2 text-xs font-light">
                      <button onClick={() => handleMobileNav("/shop?length=Short")} className="text-left py-1 hover:text-primary">Short</button>
                      <button onClick={() => handleMobileNav("/shop?length=Medium")} className="text-left py-1 hover:text-primary">Medium</button>
                      <button onClick={() => handleMobileNav("/shop?length=Long")} className="text-left py-1 hover:text-primary">Long</button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <button
              onClick={() => handleMobileNav("/shop")}
              className="w-full text-left font-serif text-base text-foreground hover:text-primary transition-colors py-2 border-b border-border/10"
            >
              All Collections
            </button>

            <button
              onClick={() => handleMobileNav("/sizing-guide")}
              className="w-full text-left font-serif text-base text-foreground hover:text-primary transition-colors py-2 border-b border-border/10"
            >
              Find Your Size
            </button>

            <button
              onClick={() => handleMobileNav("/admin")}
              className="w-full text-left font-serif text-base text-foreground hover:text-primary transition-colors py-2 border-b border-border/10"
            >
              Admin Dashboard
            </button>
          </div>
        </DrawerBody>

        <DrawerFooter className="bg-secondary/15 border-t border-border/10 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HelpCircle className="w-4 h-4 text-primary shrink-0" />
            <span>Need sizing assistance?</span>
          </div>
          <Button onClick={() => handleMobileNav("/sizing-guide")} variant="outline" size="sm" className="w-full">
            View Sizing Guide
          </Button>
        </DrawerFooter>
      </Drawer>
    </>
  );
}
