"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowRight, Heart } from "lucide-react";
import { Button } from "../ui/button";

interface FooterProps {
  storeLogo?: string;
  storeName?: string;
}

export function Footer({ storeLogo = "", storeName = "Snail Studio" }: FooterProps) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="bg-background text-foreground mt-auto border-t border-border">
      {/* Newsletter signup area banner */}
      <div className="bg-[#EFD3C9] border-b border-border py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 text-center md:text-left max-w-xl">
            <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Join the Studio Club</span>
            <h3 className="font-serif text-xl sm:text-2xl font-normal text-foreground tracking-wide">
              Unlock early access to new collections & exclusive offers
            </h3>
            <p className="text-xs text-muted-foreground font-light">
              Receive 10% off your first purchase when you sign up. No spam, only luxury nail releases.
            </p>
          </div>

          <div className="w-full md:w-auto min-w-[320px] sm:min-w-[400px]">
            {subscribed ? (
              <div className="p-4 bg-white border border-primary/20 rounded-2xl text-center text-xs font-medium text-primary shadow-xs">
                ✨ Thank you for subscribing! Check your inbox for your 10% off code.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full bg-white border border-border rounded-full pl-5 pr-14 py-3 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors placeholder:text-muted-foreground/50 font-light"
                  required
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary/95 text-primary-foreground p-2 rounded-full transition-colors cursor-pointer"
                  aria-label="Subscribe"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Main Footer links and details */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="space-y-6 col-span-1 md:col-span-1">
          <Link prefetch={false} href="/" className="inline-block shrink-0">
            {storeLogo ? (
              <div className="relative w-[90px] h-[45px] sm:w-[100px] sm:h-[50px] md:w-[110px] md:h-[55px] lg:w-[120px] lg:h-[60px] shrink-0 overflow-hidden">
                <Image
                  src={storeLogo}
                  alt={storeName}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <span className="font-serif text-2xl font-semibold tracking-wide bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {storeName}
              </span>
            )}
          </Link>
          <p className="text-xs text-muted-foreground font-light leading-relaxed max-w-sm">
            Handcrafting premium, luxury press-on nails that offer high-fashion aesthetics without compromise. Experience salon-quality manicures in minutes.
          </p>
          <div className="flex gap-4">
            <a
              href="https://www.instagram.com/snailstudio.in?igsh=aXR6Zmw0a293anNo"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors shadow-xs"
              aria-label="Instagram"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61593206786806&mibextid=wwXIfr"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors shadow-xs"
              aria-label="Facebook"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a
              href="mailto:hello@snailstudio.in"
              className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors shadow-xs"
              aria-label="Email"
            >
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-serif text-sm font-semibold tracking-wider mb-6 text-foreground">Collections</h4>
          <ul className="space-y-3.5 text-xs text-muted-foreground font-light">
            <li>
              <Link prefetch={false} href="/shop?shape=coffin" className="hover:text-primary transition-colors">
                Coffin Shape Sets
              </Link>
            </li>
            <li>
              <Link prefetch={false} href="/shop?shape=almond" className="hover:text-primary transition-colors">
                Almond Shape Sets
              </Link>
            </li>
            <li>
              <Link prefetch={false} href="/shop?length=short" className="hover:text-primary transition-colors">
                Short Length Sets
              </Link>
            </li>
            <li>
              <Link prefetch={false} href="/shop?texture=glossy" className="hover:text-primary transition-colors">
                Glossy Finishes
              </Link>
            </li>
            <li>
              <Link prefetch={false} href="/shop?texture=matte" className="hover:text-primary transition-colors">
                Matte Collections
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif text-sm font-semibold tracking-wider mb-6 text-foreground">Client Support</h4>
          <ul className="space-y-3.5 text-xs text-muted-foreground font-light">
            <li>
              <Link prefetch={false} href="/sizing-guide" className="hover:text-primary transition-colors">
                Sizing Chart & Care
              </Link>
            </li>
            <li>
              <Link prefetch={false} href="/shipping-returns" className="hover:text-primary transition-colors">
                Shipping & Returns
              </Link>
            </li>
            <li>
              <Link prefetch={false} href="/faq" className="hover:text-primary transition-colors">
                Frequently Asked Questions
              </Link>
            </li>
            <li>
              <Link prefetch={false} href="/contact" className="hover:text-primary transition-colors">
                Contact Support
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif text-sm font-semibold tracking-wider mb-6 text-foreground">About Us</h4>
          <p className="text-xs text-muted-foreground font-light leading-relaxed mb-4">
            Our nails are 100% reusable, non-damaging, and customized. Each set is handcrafted by professional nail artists using premium gel polishes.
          </p>
          <div className="p-4 bg-white border border-border rounded-2xl flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <div className="space-y-0.5">
              <h5 className="text-[10px] uppercase font-bold tracking-wider text-foreground">Locally Designed</h5>
              <p className="text-[10px] text-muted-foreground font-light leading-relaxed">
                Handcrafted with pride in India. Reusable & sustainable.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright & policies */}
      <div className="border-t border-border py-8 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted-foreground font-light gap-4">
          <p>&copy; {new Date().getFullYear()} Snail Studio. All rights reserved.</p>
          <div className="flex gap-6">
            <Link prefetch={false} href="/privacy-policy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link prefetch={false} href="/terms-of-service" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
