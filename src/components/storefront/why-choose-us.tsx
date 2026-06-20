"use client";

import React from "react";
import { Sparkles, ShieldCheck, Infinity, Gem } from "lucide-react";

export function WhyChooseUs() {
  const benefits = [
    {
      icon: Sparkles,
      title: "Couture Craftsmanship",
      description: "Each set is individually styled with top-tier builder gels, hand-painted detailing, and genuine gold-leaf flakes for a realistic, high-end gel finish.",
    },
    {
      icon: ShieldCheck,
      title: "Zero Damage Application",
      description: "Apply easily in under 15 minutes using non-toxic nail glue or adhesive tabs. Safely switch styles without filing or thinning your natural nails.",
    },
    {
      icon: Infinity,
      title: "Infinite Reusability",
      description: "Engineered with multi-layer structural strength. With proper removal and storage, our nails can be reused up to 5+ times without losing their structure.",
    },
    {
      icon: Gem,
      title: "Premium Quality & Fit",
      description: "Offered in XS, S, M, L standard sizes, with custom sizing available. Every kit includes prep accessories, keeping salon quality always within reach.",
    },
  ];

  return (
    <section id="benefits" className="py-24 bg-background border-y border-border/20 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute left-1/4 top-1/4 w-96 h-96 bg-primary/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute right-1/4 bottom-1/4 w-96 h-96 bg-accent/5 rounded-full filter blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
          <span className="text-xs uppercase tracking-widest text-primary font-bold">Our Philosophy</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-foreground mt-2">
            The Luxury Press-On Experience
          </h2>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            Designed for those who refuse to compromise on nail health, convenience, or couture-level aesthetics.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className="group p-8 rounded-3xl bg-gradient-to-br from-card to-secondary/15 border border-border/40 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-5">
                  {/* Icon Circle */}
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105 group-hover:rotate-3 transition-all duration-500">
                    <Icon className="w-5 h-5 transition-transform duration-500" />
                  </div>
                  
                  {/* Text Details */}
                  <div className="space-y-2">
                    <h3 className="font-serif text-lg font-medium text-foreground group-hover:text-primary transition-colors">
                      {benefit.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed font-light">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
