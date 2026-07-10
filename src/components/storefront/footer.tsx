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
    <footer className="bg-foreground text-background mt-auto border-t border-border/10">
      {/* Newsletter signup area banner */}
      <div className="border-b border-background/10 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 text-center md:text-left max-w-xl">
            <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Join the Studio Club</span>
            <h3 className="font-serif text-xl sm:text-2xl font-normal text-background tracking-wide">
              Unlock early access to new collections & exclusive offers
            </h3>
            <p className="text-xs text-background/60 font-light">
              Receive 10% off your first purchase when you sign up. No spam, only luxury nail releases.
            </p>
          </div>

          <div className="w-full md:w-auto min-w-[320px] sm:min-w-[400px]">
            {subscribed ? (
              <div className="p-4 bg-background/5 border border-primary/20 rounded-2xl text-center text-xs font-medium text-primary">
                ✨ Thank you for subscribing! Check your inbox for your 10% off code.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full bg-background/5 border border-background/25 rounded-full pl-5 pr-14 py-3 text-xs text-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors placeholder:text-background/45 font-light"
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
          <Link href="/" className="inline-block">
            {storeLogo ? (
              <Image
                src={storeLogo}
                alt={storeName}
                width={300}
                height={64}
                className="h-16 w-auto object-contain invert dark:invert-0"
              />
            ) : (
              <span className="font-serif text-2xl font-semibold tracking-wide bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {storeName}
              </span>
            )}
          </Link>
          <p className="text-xs text-background/60 font-light leading-relaxed max-w-sm">
            Handcrafting premium, luxury press-on nails that offer high-fashion aesthetics without compromise. Experience salon-quality manicures in minutes.
          </p>
          <div className="flex gap-4">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-background/5 border border-background/10 flex items-center justify-center text-background/60 hover:text-primary hover:bg-background/10 transition-colors"
              aria-label="Instagram"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-background/5 border border-background/10 flex items-center justify-center text-background/60 hover:text-primary hover:bg-background/10 transition-colors"
              aria-label="Facebook"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a
              href="mailto:hello@snailstudio.in"
              className="w-8 h-8 rounded-full bg-background/5 border border-background/10 flex items-center justify-center text-background/60 hover:text-primary hover:bg-background/10 transition-colors"
              aria-label="Email"
            >
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-serif text-sm font-semibold tracking-wider mb-6 text-background">Collections</h4>
          <ul className="space-y-3.5 text-xs text-background/70 font-light">
            <li>
              <Link href="/shop?shape=coffin" className="hover:text-primary transition-colors">
                Coffin Shape Sets
              </Link>
            </li>
            <li>
              <Link href="/shop?shape=almond" className="hover:text-primary transition-colors">
                Almond Shape Sets
              </Link>
            </li>
            <li>
              <Link href="/shop?length=short" className="hover:text-primary transition-colors">
                Short Length Sets
              </Link>
            </li>
            <li>
              <Link href="/shop?texture=glossy" className="hover:text-primary transition-colors">
                Glossy Finishes
              </Link>
            </li>
            <li>
              <Link href="/shop?texture=matte" className="hover:text-primary transition-colors">
                Matte Collections
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif text-sm font-semibold tracking-wider mb-6 text-background">Client Support</h4>
          <ul className="space-y-3.5 text-xs text-background/70 font-light">
            <li>
              <Link href="/sizing-guide" className="hover:text-primary transition-colors">
                Sizing Chart & Care
              </Link>
            </li>
            <li>
              <Link href="/shipping-returns" className="hover:text-primary transition-colors">
                Shipping & Returns
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-primary transition-colors">
                Frequently Asked Questions
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-primary transition-colors">
                Contact Support
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif text-sm font-semibold tracking-wider mb-6 text-background">About Us</h4>
          <p className="text-xs text-background/70 font-light leading-relaxed mb-4">
            Our nails are 100% reusable, non-damaging, and customized. Each set is handcrafted by professional nail artists using premium gel polishes.
          </p>
          <div className="p-4 bg-background/5 border border-background/10 rounded-2xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <div className="space-y-0.5">
              <h5 className="text-[10px] uppercase font-bold tracking-wider text-background">Locally Designed</h5>
              <p className="text-[10px] text-background/50 font-light leading-relaxed">
                Handcrafted with pride in India. Reusable & sustainable.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright & policies */}
      <div className="border-t border-background/10 py-8 bg-foreground/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-background/50 font-light gap-4">
          <p>&copy; {new Date().getFullYear()} Snail Studio. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy-policy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
