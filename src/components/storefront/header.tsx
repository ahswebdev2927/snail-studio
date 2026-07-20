"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
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
import type { StorefrontNavigation } from "@/services/navigation";
import { syncWishlistDb } from "@/features/pdp/actions";
import { getCurrentUser } from "@/features/account/actions";
import { UserAvatar } from "@/app/(shop)/account/user-avatar";
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "../ui/modal";

interface HeaderProps {
  navigationData?: StorefrontNavigation;
  storeLogo?: string;
  storeName?: string;
}

export function Header({ navigationData, storeLogo = "", storeName = "Snail Studio" }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [nav, setNav] = useState<StorefrontNavigation | null>(navigationData || null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string | null; email: string | null; role: string; image: string | null; phoneNumber: string } | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDropdownMouseEnter = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setUserDropdownOpen(true);
  };

  const handleDropdownMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setUserDropdownOpen(false);
    }, 200); // 200ms delay to bridge the hover gap
  };

  useEffect(() => {
    return () => {
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (err) {
        console.error("Failed to load user in header:", err);
      }
    }
    loadUser();
  }, [pathname]);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setUserDropdownOpen(false);
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        setCurrentUser(null);
        setShowLogoutModal(false);
        router.push("/login");
      }
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };
  
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

  // Sync wishlist with DB on mount if user is logged in
  useEffect(() => {
    async function sync() {
      const localWishlist = useCartStore.getState().wishlist;
      try {
        const res = await syncWishlistDb(localWishlist);
        if (res.success && res.wishlist) {
          useCartStore.setState({ wishlist: res.wishlist });
          localStorage.setItem("snail_wishlist", JSON.stringify(res.wishlist));
        }
      } catch (err) {
        console.error("Failed to sync database wishlist on mount:", err);
      }
    }
    const timer = setTimeout(sync, 250);
    return () => clearTimeout(timer);
  }, []);

  // Client-side fetch fallback if server prop is missing
  useEffect(() => {
    if (navigationData) {
      setNav(navigationData);
      return;
    }

    let isMounted = true;
    const fetchNav = async () => {
      try {
        const res = await fetch("/api/navigation");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setNav(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch navigation client-side:", err);
      }
    };

    fetchNav();
    return () => {
      isMounted = false;
    };
  }, [navigationData]);

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
      setTheme("light");
      document.documentElement.classList.remove("dark");
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

  // Compile lists dynamically with static fallbacks for safety
  const shapeGroup = nav?.shop?.attributeGroups?.find((g) => g.code === "shape");
  const shapesList = shapeGroup?.values || [
    { name: "Coffin", url: "/shop?shape=coffin" },
    { name: "Almond", url: "/shop?shape=almond" },
    { name: "Stiletto", url: "/shop?shape=stiletto" },
    { name: "Square", url: "/shop?shape=square" },
  ];

  const lengthGroup = nav?.shop?.attributeGroups?.find((g) => g.code === "length");
  const lengthsList = lengthGroup?.values || [
    { name: "Short", url: "/shop?length=short" },
    { name: "Medium", url: "/shop?length=medium" },
    { name: "Long", url: "/shop?length=long" },
  ];

  const occasionGroup = nav?.shop?.attributeGroups?.find((g) => g.code === "occasion");
  const occasionsList = occasionGroup?.values || [
    { name: "Casual", url: "/shop?occasion=casual" },
    { name: "Wedding", url: "/shop?occasion=wedding" },
    { name: "Party", url: "/shop?occasion=party" },
  ];

  const collectionsList = nav?.shop?.collections?.length
    ? nav.shop.collections
    : [
        { name: "Best Sellers", url: "/shop?sort=best_selling" },
        { name: "New Arrivals", url: "/shop?sort=newest" },
      ];

  const promo = nav?.promoBanner;

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
              {storeLogo ? (
                <div className="relative h-16 w-auto flex items-center">
                  <Image
                    src={storeLogo}
                    alt={storeName}
                    width={300}
                    height={64}
                    className="h-16 w-auto object-contain"
                    priority
                  />
                </div>
              ) : (
                <span className="font-serif text-2xl font-semibold tracking-wide bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {storeName}
                </span>
              )}
            </Link>
          </div>

          {/* Center: Desktop Mega Menu */}
          <nav className="hidden lg:flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-foreground/80 font-inter">
            {/* Home */}
            <Link
              href="/"
              className="px-4 py-2.5 rounded-full hover:text-primary transition-all"
            >
              Home
            </Link>

            {/* Shop dropdown (Mega Menu) */}
            <div className="group py-2.5">
              <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-full hover:text-primary transition-all cursor-pointer">
                Shop
                <ChevronDown className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-200" />
              </button>

              {/* Full-width Mega Menu Dropdown */}
              <div className="absolute top-full left-0 right-0 bg-card border-b border-border/20 shadow-2xl pointer-events-none opacity-0 translate-y-2 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-100 before:content-[''] before:absolute before:bottom-full before:left-0 before:right-0 before:h-6 before:bg-transparent">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-12 gap-8">
                  <div className={`${promo ? "col-span-9" : "col-span-12"} grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8`}>
                    {/* Attribute columns */}
                    {nav?.shop?.attributeGroups?.map((group) => (
                      <div key={group.code} className="space-y-4">
                        <h4 className="font-serif text-xs font-bold text-foreground border-b border-border/10 pb-2 normal-case tracking-wider">
                          Shop by {group.name}
                        </h4>
                        <ul className="space-y-2.5 text-xs font-light text-muted-foreground normal-case tracking-normal">
                          {group.values.map((val) => (
                            <li key={val.name}>
                              <Link href={val.url} className="hover:text-primary transition-colors">
                                {val.name} {group.code === "shape" ? "Shape" : group.code === "length" ? "Nails" : ""}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}

                    {/* Categories Column */}
                    {nav?.shop?.categories && nav.shop.categories.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-serif text-xs font-bold text-foreground border-b border-border/10 pb-2 normal-case tracking-wider">
                          Shop by Category
                        </h4>
                        <ul className="space-y-2.5 text-xs font-light text-muted-foreground normal-case tracking-normal">
                          {nav.shop.categories.map((cat) => (
                            <li key={cat.name}>
                              <Link href={cat.url} className="hover:text-primary transition-colors">
                                {cat.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Collections Column */}
                    {nav?.shop?.collections && nav.shop.collections.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-serif text-xs font-bold text-foreground border-b border-border/10 pb-2 normal-case tracking-wider">
                          Collections
                        </h4>
                        <ul className="space-y-2.5 text-xs font-light text-muted-foreground normal-case tracking-normal">
                          {nav.shop.collections.map((col) => (
                            <li key={col.name}>
                              <Link href={col.url} className="hover:text-primary transition-colors">
                                {col.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Promotion Banner */}
                  {promo && (
                    <div className="col-span-3 bg-gradient-to-br from-secondary/50 to-primary/5 border border-border/40 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden h-full min-h-[220px]">
                      {promo.imageUrl && (
                        <div
                          className="absolute inset-0 opacity-15 bg-cover bg-center pointer-events-none"
                          style={{ backgroundImage: `url(${promo.imageUrl})` }}
                        />
                      )}
                      <div className="space-y-2 z-10">
                        <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                          <Sparkles className="w-2.5 h-2.5" />
                          Featured
                        </span>
                        <h5 className="font-serif text-sm font-semibold text-foreground leading-tight tracking-wide">
                          {promo.title}
                        </h5>
                        <p className="text-[10px] text-muted-foreground font-light leading-relaxed normal-case tracking-normal">
                          {promo.subtitle}
                        </p>
                      </div>
                      <Link
                        href={promo.ctaLink}
                        className="inline-flex items-center text-[10px] font-semibold text-primary uppercase tracking-widest hover:text-accent transition-colors pt-3 z-10 group mt-auto"
                      >
                        {promo.ctaText}
                        <ArrowRight className="ml-1 w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </Link>
                      <div className="absolute right-[-20px] bottom-[-20px] w-20 h-20 rounded-full bg-accent/10 blur-xl pointer-events-none" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dynamic Parent Categories (e.g. Care & Accessories) */}
            {nav?.categories?.map((cat) => {
              // Press On Nails is already represented by the main Shop menu dropdown
              if (cat.slug === "press-on-nails" || cat.slug === "care-and-accessories") return null;

              if (cat.children && cat.children.length > 0) {
                return (
                  <div key={cat.id} className="group relative py-2.5">
                    <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-full hover:text-primary transition-all cursor-pointer">
                      {cat.name}
                      <ChevronDown className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-200" />
                    </button>
                    <div className="absolute top-full left-0 pt-4 w-48 pointer-events-none opacity-0 translate-y-2 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-100">
                      <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-xl space-y-2">
                        {cat.children.map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/shop?category=${sub.slug}`}
                            className="block text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors normal-case tracking-wider"
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={cat.id}
                  href={`/shop?category=${cat.slug}`}
                  className="px-4 py-2.5 rounded-full hover:text-primary transition-all"
                >
                  {cat.name}
                </Link>
              );
            })}

            {/* Sizing Guide */}
            <Link
              href="/sizing-guide"
              className="px-4 py-2.5 rounded-full hover:text-primary transition-all"
            >
              Sizing
            </Link>

            {/* Contact */}
            <Link
              href="/contact"
              className="px-4 py-2.5 rounded-full hover:text-primary transition-all"
            >
              Contact
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

            {/* Profile / Admin Login Link Dropdown */}
            <div 
              className="relative"
              onMouseEnter={handleDropdownMouseEnter}
              onMouseLeave={handleDropdownMouseLeave}
            >
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="p-2 rounded-full text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all cursor-pointer flex items-center gap-1 focus:outline-hidden"
                aria-label="User Account Menu"
              >
                <User className="w-4 h-4" />
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${userDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {userDropdownOpen && (
                <>
                  {/* Invisible backdrop click-away (mobile only) */}
                  <div
                    className="fixed inset-0 z-40 cursor-default md:hidden"
                    onClick={() => setUserDropdownOpen(false)}
                  />

                  {/* Dropdown Card */}
                  <div className="absolute right-0 mt-2.5 w-56 rounded-2xl border border-border/40 bg-card p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {currentUser ? (
                      <>
                        {/* User Header */}
                        <div className="px-3.5 py-2.5 border-b border-border/10 flex items-center gap-2.5">
                          <UserAvatar
                            image={currentUser.image}
                            name={currentUser.name}
                            phone={currentUser.phoneNumber}
                            className="w-9 h-9 rounded-xl shadow-inner border border-primary/5 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {currentUser.name || "My Account"}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate font-light mt-0.5">
                              {currentUser.phoneNumber}
                            </p>
                            {currentUser.role === "admin" && (
                              <span className="inline-block mt-1 px-1.5 py-0.5 bg-primary/10 text-[8px] font-bold uppercase tracking-wider rounded text-primary">
                                Admin Account
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Navigation Links */}
                        <div className="pt-1.5 space-y-0.5">
                          {currentUser.role === "admin" && (
                            <Link
                              href="/admin/dashboard"
                              onClick={() => setUserDropdownOpen(false)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium rounded-xl text-foreground hover:bg-secondary/65 transition-colors"
                            >
                              Admin Dashboard
                            </Link>
                          )}
                          <Link
                            href="/account"
                            onClick={() => setUserDropdownOpen(false)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium rounded-xl text-foreground hover:bg-secondary/65 transition-colors"
                          >
                            My Account
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="w-full text-left flex items-center gap-2 px-3 py-2 text-[11px] font-bold rounded-xl text-rose-500 hover:bg-rose-500/5 transition-colors cursor-pointer"
                          >
                            Sign Out
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Guest Header */}
                        <div className="px-3.5 py-2.5 border-b border-border/10">
                          <p className="text-xs font-semibold text-foreground">
                            Hello, Guest user
                          </p>
                          <p className="text-[10px] text-muted-foreground font-light mt-0.5 leading-normal">
                            login to have immense shopping experience
                          </p>
                        </div>

                        {/* Guest Action Links */}
                        <div className="pt-1.5 space-y-0.5">
                          <Link
                            href="/account"
                            onClick={() => setUserDropdownOpen(false)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold rounded-xl text-primary hover:bg-primary/5 transition-colors"
                          >
                            Sign in \ Register
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer (Left Side) */}
      <Drawer isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} side="left">
        <DrawerHeader>
          <DrawerTitle className="font-serif text-xl font-semibold tracking-wide bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {storeLogo ? (
              <div className="relative h-12 w-auto flex items-center">
                <Image
                  src={storeLogo}
                  alt={storeName}
                  width={240}
                  height={48}
                  className="h-12 w-auto object-contain"
                />
              </div>
            ) : (
              storeName
            )}
          </DrawerTitle>
        </DrawerHeader>

        <DrawerBody className="p-0">
          <div className="px-6 py-4 flex flex-col space-y-4">
            <button
              onClick={() => handleMobileNav("/")}
              className="w-full text-left font-inter text-sm font-medium text-foreground hover:text-primary transition-colors py-2 border-b border-border/10 cursor-pointer"
            >
              Home
            </button>

            <Accordion type="single" className="w-full border-none">
              {/* Dynamic Shop Press-Ons Menu */}
              <AccordionItem value="shop-menu" className="border-b border-border/10">
                <AccordionTrigger className="py-2.5 font-inter text-sm font-medium hover:no-underline hover:text-primary">
                  Shop Press-Ons
                </AccordionTrigger>
                <AccordionContent className="pl-4 space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-primary block">By Shape</span>
                    <div className="grid grid-cols-2 gap-2 text-xs font-light">
                      {shapesList.map((shape) => (
                        <button
                          key={shape.name}
                          onClick={() => handleMobileNav(shape.url)}
                          className="text-left py-1 hover:text-primary cursor-pointer"
                        >
                          {shape.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-primary block">By Length</span>
                    <div className="grid grid-cols-3 gap-2 text-xs font-light">
                      {lengthsList.map((length) => (
                        <button
                          key={length.name}
                          onClick={() => handleMobileNav(length.url)}
                          className="text-left py-1 hover:text-primary cursor-pointer"
                        >
                          {length.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-primary block">By Occasion</span>
                    <div className="grid grid-cols-2 gap-2 text-xs font-light">
                      {occasionsList.map((occasion) => (
                        <button
                          key={occasion.name}
                          onClick={() => handleMobileNav(occasion.url)}
                          className="text-left py-1 hover:text-primary cursor-pointer"
                        >
                          {occasion.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-primary block">Collections</span>
                    <div className="grid grid-cols-2 gap-2 text-xs font-light">
                      {collectionsList.map((col) => (
                        <button
                          key={col.name}
                          onClick={() => handleMobileNav(col.url)}
                          className="text-left py-1 hover:text-primary cursor-pointer"
                        >
                          {col.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Dynamic Accordions for other parent categories (e.g. Care & Accessories) */}
              {nav?.categories?.map((cat) => {
                if (cat.slug === "press-on-nails" || cat.slug === "care-and-accessories") return null;

                if (cat.children && cat.children.length > 0) {
                  return (
                    <AccordionItem key={cat.id} value={cat.slug} className="border-b border-border/10">
                      <AccordionTrigger className="py-2.5 font-inter text-sm font-medium hover:no-underline hover:text-primary">
                        {cat.name}
                      </AccordionTrigger>
                      <AccordionContent className="pl-4 space-y-2 pt-2 text-xs font-light">
                        {cat.children.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => handleMobileNav(`/shop?category=${sub.slug}`)}
                            className="w-full text-left py-1 hover:text-primary cursor-pointer block"
                          >
                            {sub.name}
                          </button>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  );
                }

                return null;
              })}
            </Accordion>

            {/* Flat categories menu items (no children) */}
            {nav?.categories?.map((cat) => {
              if (cat.slug === "press-on-nails" || cat.slug === "care-and-accessories") return null;
              if (cat.children && cat.children.length > 0) return null;

              return (
                <button
                  key={cat.id}
                  onClick={() => handleMobileNav(`/shop?category=${cat.slug}`)}
                  className="w-full text-left font-inter text-sm font-medium text-foreground hover:text-primary transition-colors py-2 border-b border-border/10 cursor-pointer"
                >
                  {cat.name}
                </button>
              );
            })}

            <button
              onClick={() => handleMobileNav("/shop")}
              className="w-full text-left font-inter text-sm font-medium text-foreground hover:text-primary transition-colors py-2 border-b border-border/10 cursor-pointer"
            >
              All Collections
            </button>

            <button
              onClick={() => handleMobileNav("/sizing-guide")}
              className="w-full text-left font-inter text-sm font-medium text-foreground hover:text-primary transition-colors py-2 border-b border-border/10 cursor-pointer"
            >
              Find Your Size
            </button>

            <button
              onClick={() => handleMobileNav("/contact")}
              className="w-full text-left font-inter text-sm font-medium text-foreground hover:text-primary transition-colors py-2 border-b border-border/10 cursor-pointer"
            >
              Contact
            </button>

            {currentUser ? (
              <>
                {currentUser.role === "admin" && (
                  <button
                    onClick={() => handleMobileNav("/admin/dashboard")}
                    className="w-full text-left font-inter text-sm font-medium text-foreground hover:text-primary transition-colors py-2 border-b border-border/10 cursor-pointer"
                  >
                    Admin Dashboard
                  </button>
                )}
                <button
                  onClick={() => handleMobileNav("/account")}
                  className="w-full text-left font-inter text-sm font-medium text-foreground hover:text-primary transition-colors py-2 border-b border-border/10 cursor-pointer"
                >
                  My Account
                </button>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left font-inter text-sm font-medium text-rose-500 hover:text-rose-600 transition-colors py-2 border-b border-border/10 cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => handleMobileNav("/account")}
                className="w-full text-left font-inter text-sm font-medium text-foreground hover:text-primary transition-colors py-2 border-b border-border/10 cursor-pointer"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </DrawerBody>

        <DrawerFooter className="bg-secondary/15 border-t border-border/10 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HelpCircle className="w-4 h-4 text-primary shrink-0" />
            <span>Need sizing assistance?</span>
          </div>
          <Button onClick={() => handleMobileNav("/sizing-guide")} variant="outline" size="sm" className="w-full cursor-pointer">
            View Sizing Guide
          </Button>
        </DrawerFooter>
      </Drawer>

      <Modal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)}>
        <ModalHeader>
          <ModalTitle>Confirm Sign Out</ModalTitle>
          <ModalDescription>
            Are you sure you want to sign out of Snail Studio? You will need to sign in again to access your wishlist, saved orders, and account profile details.
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowLogoutModal(false)}
            className="w-full sm:w-auto cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirmLogout}
            isLoading={isLoggingOut}
            className="w-full sm:w-auto cursor-pointer"
          >
            Sign Out
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

