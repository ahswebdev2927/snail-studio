"use client";

import React, { useState } from "react";
import {
  FileText,
  Sparkles,
  HelpCircle,
  Truck,
  HeartHandshake,
  CheckCircle2,
  Info,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductTabsProps {
  description?: string | null;
}

type TabType = "description" | "apply" | "shipping" | "faq";

export function ProductTabs({ description }: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("description");
  const [applyMethod, setApplyMethod] = useState<"tabs" | "glue">("tabs");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: "description", label: "Description", icon: FileText },
    { id: "apply", label: "How to Apply", icon: Sparkles },
    { id: "shipping", label: "Shipping & Returns", icon: Truck },
    { id: "faq", label: "FAQs", icon: HelpCircle },
  ];

  const faqs = [
    {
      q: "Are Snail Studio press-on nails reusable?",
      a: "Yes! If you apply them using our Adhesive Glue Tabs, they can be easily peeled off and reused multiple times. If you use Liquid Nail Glue, they are still reusable if you gently buff away the old glue residue from the back of the press-on nails using the wooden stick and nail buffer included in your kit.",
    },
    {
      q: "How do I find my correct nail size?",
      a: "No measuring required! Every Snail Studio press-on nail set comes with 24 nails covering 10 to 12 different sizes. This ensures a perfect fit for every finger shape and size, with extra spares to customize your fit.",
    },
    {
      q: "Will press-on nails damage my natural nails?",
      a: "No! Adhesive tabs cause zero damage and are perfect for short-term wear. For liquid glue, as long as you follow our recommended soak-off removal guide (using warm soapy water and cuticle oil) and never rip them off by force, your natural nails will remain completely healthy and undamaged.",
    },
    {
      q: "How long do they last?",
      a: "Adhesive tabs typically last 1 to 3 days, making them perfect for weekend wear or special events. Liquid nail glue can last 2 to 3 weeks with proper application, light prep, and a secure fit.",
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 border-t border-border/30">
      {/* Tab Navigation */}
      <div className="flex border-b border-border/30 overflow-x-auto scrollbar-none gap-2 md:gap-8 justify-start md:justify-center mb-8 pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-4 text-xs font-semibold uppercase tracking-widest transition-all duration-300 relative border-b-2 shrink-0 cursor-pointer",
                isActive
                  ? "border-primary text-primary font-bold scale-[1.02]"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-in fade-in zoom-in-95 duration-300" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Window */}
      <div className="min-h-[300px] w-full max-w-4xl mx-auto transition-all duration-300">
        
        {/* TAB 1: DESCRIPTION */}
        {activeTab === "description" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="space-y-4">
              <h3 className="font-serif text-2xl font-normal text-foreground">
                About This Nail Set
              </h3>
              <div className="text-sm text-muted-foreground leading-loose font-light">
                {description ? (
                  parseDescription(description)
                ) : (
                  <p className="text-sm text-muted-foreground leading-loose font-light">
                    No description provided for this product set. Snail Studio luxury press-on nails are handcrafted to perfection.
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-border/20 pt-8">
              <h4 className="font-serif text-lg font-normal text-foreground mb-6">
                What's Included In Your Kit
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { title: "24 Custom Nails", desc: "All sizes included for a perfect fit" },
                  { title: "Liquid Nail Glue (2g)", desc: "Super-hold glue for 2-3 weeks wear" },
                  { title: "24 Adhesive Glue Tabs", desc: "Damage-free tabs for short wear" },
                  { title: "Wooden Cuticle Stick", desc: "To push cuticles & clean edges" },
                  { title: "Mini Buffer & File", desc: "For easy nail prep and shaping" },
                  { title: "2 Alcohol Prep Pads", desc: "Removes oil and dust for maximum hold" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-secondary/20 border border-border/25 flex flex-col gap-1.5"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-xs font-bold text-foreground mt-1">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground font-light leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HOW TO APPLY */}
        {activeTab === "apply" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col items-center gap-4 mb-6">
              <h3 className="font-serif text-2xl font-normal text-foreground text-center">
                Application Instructions
              </h3>
              <p className="text-xs text-muted-foreground text-center max-w-md font-light">
                Choose your application method based on how long you want your manicure to last.
              </p>

              {/* Method Switcher */}
              <div className="flex bg-secondary/50 border border-border/30 p-1.5 rounded-full mt-2">
                <button
                  onClick={() => setApplyMethod("tabs")}
                  className={cn(
                    "px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer",
                    applyMethod === "tabs"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Adhesive Tabs (1-3 Days)
                </button>
                <button
                  onClick={() => setApplyMethod("glue")}
                  className={cn(
                    "px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer",
                    applyMethod === "glue"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Nail Glue (2-3 Weeks)
                </button>
              </div>
            </div>

            {/* Preparation Steps (Common) */}
            <div className="bg-secondary/20 border border-border/20 rounded-3xl p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-2 border-b border-border/10 pb-4">
                <HeartHandshake className="w-5 h-5 text-primary" />
                <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Step 1: Prep Your Nails (Crucial for longevity)
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { num: "01", title: "Push Back Cuticles", desc: "Use the wooden cuticle stick to push back overgrown cuticles for a cleaner fit." },
                  { num: "02", title: "Buff Lightly", desc: "Gently buff the shine off your natural nail surfaces to create a texture for the adhesive to grip." },
                  { num: "03", title: "Wipe Clean", desc: "Use the alcohol prep pad to clean away all dust, oil, and moisture. Let dry completely." },
                ].map((step, i) => (
                  <div key={i} className="space-y-2 relative">
                    <span className="font-mono text-2xl font-extrabold text-primary/20 absolute -top-4 left-0">{step.num}</span>
                    <h5 className="text-xs font-bold text-foreground pt-3">{step.title}</h5>
                    <p className="text-[11px] text-muted-foreground font-light leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Wear Steps */}
            <div className="bg-secondary/20 border border-border/20 rounded-3xl p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-2 border-b border-border/10 pb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Step 2: Apply & Secure
                </h4>
              </div>

              {applyMethod === "tabs" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { num: "04", title: "Select Tab Size", desc: "Find the adhesive tab that matches the size of your natural nail (avoid overflow)." },
                    { num: "05", title: "Stick & Press Tab", desc: "Place the tab on your nail, press it flat, and peel off the plastic protective film." },
                    { num: "06", title: "Apply Nail at 45°", desc: "Align the press-on at the cuticle line, lower it down, and press firmly for 30 seconds." },
                  ].map((step, i) => (
                    <div key={i} className="space-y-2 relative">
                      <span className="font-mono text-2xl font-extrabold text-primary/20 absolute -top-4 left-0">{step.num}</span>
                      <h5 className="text-xs font-bold text-foreground pt-3">{step.title}</h5>
                      <p className="text-[11px] text-muted-foreground font-light leading-relaxed">{step.desc}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { num: "04", title: "Apply Glue Dot", desc: "Add a small drop of nail glue to the back of the press-on nail and to your natural nail." },
                    { num: "05", title: "Spread Evenly", desc: "Do not get too close to the edges to avoid glue spilling onto your skin." },
                    { num: "06", title: "Press & Hold", desc: "Align at the cuticle, press down starting from the back, and hold firmly for 30 seconds." },
                  ].map((step, i) => (
                    <div key={i} className="space-y-2 relative">
                      <span className="font-mono text-2xl font-extrabold text-primary/20 absolute -top-4 left-0">{step.num}</span>
                      <h5 className="text-xs font-bold text-foreground pt-3">{step.title}</h5>
                      <p className="text-[11px] text-muted-foreground font-light leading-relaxed">{step.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Removal Guide */}
            <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/10 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <Info className="w-4 h-4" /> Safe Removal Guide
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed font-light">
                Soak your nails in warm water mixed with a few drops of soap and cuticle oil (or coconut oil) for 10-15 minutes. Once the adhesive softens, use the wooden cuticle stick to gently nudge and lift the press-on nails from the sides. <strong>Never rip or pull them off by force</strong>, as this can tear layers from your natural nail plates.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: SHIPPING & RETURNS */}
        {activeTab === "shipping" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <h3 className="font-serif text-2xl font-normal text-foreground text-center">
              Shipping & Return Policies
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              {/* Shipping policy */}
              <div className="space-y-4 p-6 rounded-3xl bg-secondary/20 border border-border/20">
                <div className="flex items-center gap-2 pb-2 border-b border-border/10">
                  <Truck className="w-5 h-5 text-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Shipping & Timelines
                  </h4>
                </div>
                <ul className="space-y-3.5 text-xs text-muted-foreground font-light">
                  <li className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <span><strong>Dispatch</strong>: Handcrafted press-on orders are customized and shipped within 24 to 48 business hours.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <span><strong>Metro Transit</strong>: Delivered within 2–4 days after dispatch to major metro locations in India.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <span><strong>Other Regions</strong>: Delivered within 4–7 business days.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <span><strong>Shipping Cost</strong>: Free standard shipping on all prepaid orders above ₹999. Below that, flat ₹80 applies.</span>
                  </li>
                </ul>
              </div>

              {/* Returns policy */}
              <div className="space-y-4 p-6 rounded-3xl bg-secondary/20 border border-border/20">
                <div className="flex items-center gap-2 pb-2 border-b border-border/10">
                  <HeartHandshake className="w-5 h-5 text-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Hygienic Returns & Exchanges
                  </h4>
                </div>
                <ul className="space-y-3.5 text-xs text-muted-foreground font-light">
                  <li className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <span><strong>Final Sale</strong>: Due to the personal hygiene nature of press-on nails, all orders are non-returnable and non-refundable.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <span><strong>Exchange Policy</strong>: In the rare case of transit damage, missing items, or receiving a wrong product, we offer immediate replacement.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <span><strong>Claim Process</strong>: Please email us (or WhatsApp) with an unboxing video showing the damage within 48 hours of delivery to process a free exchange.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FAQS */}
        {activeTab === "faq" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h3 className="font-serif text-2xl font-normal text-foreground text-center mb-4">
              Frequently Asked Questions
            </h3>

            <div className="space-y-3 max-w-3xl mx-auto">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="border border-border/30 rounded-2xl bg-secondary/10 overflow-hidden transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left cursor-pointer hover:bg-secondary/30 transition-colors"
                    >
                      <span className="text-xs font-semibold text-foreground tracking-wide">
                        {faq.q}
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-muted-foreground transition-transform duration-300",
                          isOpen && "rotate-180 text-primary"
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-xs text-muted-foreground font-light leading-relaxed animate-in fade-in duration-200">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------
 * Markdown & HTML parser helper for product description
 * --------------------------------------------------------------------- */
function parseDescription(text: string): React.ReactNode {
  // Check if it looks like HTML (contains HTML tags like <p>, <div>, <ul>, etc.)
  const isHtml = /<[a-z][\s\S]*>/i.test(text);
  if (isHtml) {
    return (
      <div 
        className="pdp-description-content" 
        dangerouslySetInnerHTML={{ __html: text }} 
      />
    );
  }
  return <div className="pdp-description-content">{parseMarkdown(text)}</div>;
}

function parseMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let elementCounter = 0;
  
  let listItems: string[] = [];
  let orderedListItems: string[] = [];
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elementCounter++}`} className="list-disc pl-5 my-4 space-y-1.5 text-sm text-muted-foreground font-light leading-relaxed">
          {listItems.map((item, idx) => (
            <li key={`li-${idx}`}>{parseInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const flushOrderedList = () => {
    if (orderedListItems.length > 0) {
      elements.push(
        <ol key={`ol-${elementCounter++}`} className="list-decimal pl-5 my-4 space-y-1.5 text-sm text-muted-foreground font-light leading-relaxed">
          {orderedListItems.map((item, idx) => (
            <li key={`oli-${idx}`}>{parseInlineMarkdown(item)}</li>
          ))}
        </ol>
      );
      orderedListItems = [];
    }
  };

  const flushTable = () => {
    if (tableHeaders.length > 0 || tableRows.length > 0) {
      elements.push(
        <div key={`table-wrapper-${elementCounter++}`} className="overflow-x-auto my-6 border border-border/30 rounded-2xl">
          <table className="w-full text-xs text-left border-collapse">
            {tableHeaders.length > 0 && (
              <thead>
                <tr className="bg-secondary/40 border-b border-border/30">
                  {tableHeaders.map((h, idx) => (
                    <th key={`th-${idx}`} className="px-4 py-3 font-semibold text-foreground">
                      {parseInlineMarkdown(h)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr key={`tr-${rIdx}`} className="border-b border-border/20 last:border-0 hover:bg-secondary/10 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={`td-${cIdx}`} className="px-4 py-3 text-muted-foreground font-light font-sans">
                      {parseInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeaders = [];
      tableRows = [];
    }
  };

  const flushAll = () => {
    flushList();
    flushOrderedList();
    flushTable();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    let processedLine = line;
    if (processedLine.includes("<br")) {
      processedLine = processedLine.replace(/<br\s*\/?>/gi, "");
    }

    // Handle Tables
    if (processedLine.startsWith("|")) {
      flushList();
      flushOrderedList();
      
      const cells = processedLine
        .split("|")
        .map(c => c.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

      const isSeparator = cells.every(c => /^:?-+:?$/.test(c));
      
      if (isSeparator) {
        continue;
      }

      if (tableHeaders.length === 0 && tableRows.length === 0) {
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else {
      flushTable();
    }

    // Handle Ordered Lists
    const orderedMatch = processedLine.match(/^(\d+)\.\s+(.*)/);
    if (orderedMatch) {
      flushList();
      flushTable();
      orderedListItems.push(orderedMatch[2]);
      continue;
    } else {
      flushOrderedList();
    }

    // Handle Unordered Lists
    if (processedLine.startsWith("- ") || processedLine.startsWith("* ")) {
      flushOrderedList();
      flushTable();
      listItems.push(processedLine.substring(2));
      continue;
    } else {
      flushList();
    }

    // Handle Headers
    if (processedLine.startsWith("# ")) {
      flushAll();
      elements.push(
        <h1 key={`h1-${elementCounter++}`} className="font-serif text-2xl font-normal text-foreground mt-6 mb-4">
          {parseInlineMarkdown(processedLine.substring(2))}
        </h1>
      );
      continue;
    }
    
    if (processedLine.startsWith("## ")) {
      flushAll();
      elements.push(
        <h2 key={`h2-${elementCounter++}`} className="font-serif text-lg font-normal text-foreground mt-6 mb-3 border-b border-border/10 pb-1.5">
          {parseInlineMarkdown(processedLine.substring(3))}
        </h2>
      );
      continue;
    }

    if (processedLine.startsWith("### ")) {
      flushAll();
      elements.push(
        <h3 key={`h3-${elementCounter++}`} className="font-serif text-base font-normal text-foreground mt-4 mb-2">
          {parseInlineMarkdown(processedLine.substring(4))}
        </h3>
      );
      continue;
    }

    // Handle Horizontal Rules
    if (processedLine === "---" || processedLine === "***" || processedLine === "___") {
      flushAll();
      elements.push(<hr key={`hr-${elementCounter++}`} className="border-border/30 my-6" />);
      continue;
    }

    // Handle empty lines
    if (processedLine === "") {
      flushAll();
      elements.push(<div key={`empty-${elementCounter++}`} className="h-2" />);
      continue;
    }

    // Default paragraph
    flushAll();
    elements.push(
      <p key={`p-${elementCounter++}`} className="text-sm text-muted-foreground leading-loose font-light mb-4">
        {parseInlineMarkdown(processedLine)}
      </p>
    );
  }

  flushAll();

  return <div className="space-y-1">{elements}</div>;
}

function parseInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  remaining = remaining
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

  while (remaining) {
    const boldIndex = remaining.indexOf("**");
    
    if (boldIndex === -1) {
      parts.push(remaining);
      break;
    }

    if (boldIndex > 0) {
      parts.push(remaining.substring(0, boldIndex));
    }

    const nextBoldIndex = remaining.indexOf("**", boldIndex + 2);
    if (nextBoldIndex === -1) {
      parts.push(remaining.substring(boldIndex));
      break;
    }

    const boldText = remaining.substring(boldIndex + 2, nextBoldIndex);
    parts.push(
      <strong key={`b-${keyIdx++}`} className="font-semibold text-foreground">
        {boldText}
      </strong>
    );

    remaining = remaining.substring(nextBoldIndex + 2);
  }

  return parts;
}
