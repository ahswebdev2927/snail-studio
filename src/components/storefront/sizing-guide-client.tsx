"use client";

import React, { useState } from "react";
import {
  Ruler,
  Scale,
  Check,
  HelpCircle,
  ArrowRight,
  AlertCircle,
  Info,
  Sparkles
} from "lucide-react";
import Link from "next/link";

interface SizeProfile {
  name: string;
  description: string;
  measurements: number[]; // [Thumb, Index, Middle, Ring, Pinky] in mm
}

interface ShapeLengthRow {
  id: string;
  shape: string;
  xs: string;
  s: string;
  m: string;
  l: string;
}

interface SizingGuideClientProps {
  sizeProfiles: {
    id: string;
    name: string;
    description: string;
    thumb: number;
    index: number;
    middle: number;
    ring: number;
    pinky: number;
    isActive: boolean;
  }[];
  lengthChartData: ShapeLengthRow[];
}

const DEFAULT_SIZE_PROFILES: SizeProfile[] = [
  { name: "XS", description: "Petite hands", measurements: [14, 10, 11, 10, 8] },
  { name: "S", description: "Small hands", measurements: [15, 11, 12, 11, 9] },
  { name: "M", description: "Average / Standard hands", measurements: [16, 12, 13, 12, 10] },
  { name: "L", description: "Larger hands", measurements: [18, 13, 14, 13, 11] },
];

const NAIL_SIZE_MAP = [
  { size: "0", mm: 18 },
  { size: "1", mm: 17 },
  { size: "2", mm: 16 },
  { size: "3", mm: 15 },
  { size: "4", mm: 14 },
  { size: "5", mm: 13.5 },
  { size: "6", mm: 13 },
  { size: "7", mm: 12 },
  { size: "8", mm: 11.5 },
  { size: "9", mm: 11 },
  { size: "10", mm: 10 },
  { size: "11", mm: 9.5 },
  { size: "12", mm: 9 },
  { size: "13", mm: 8.5 },
  { size: "14", mm: 8 },
];

// Helper to convert mm to size number
function mmToSizeNum(mm: number): string {
  const match = NAIL_SIZE_MAP.find((item) => item.mm <= mm);
  return match ? match.size : "14";
}

const FINGERS = [
  { name: "Thumb", min: 13, max: 19, defaultValue: 16 },
  { name: "Index", min: 9, max: 15, defaultValue: 12 },
  { name: "Middle", min: 10, max: 16, defaultValue: 13 },
  { name: "Ring", min: 9, max: 15, defaultValue: 12 },
  { name: "Pinky", min: 7, max: 12, defaultValue: 10 },
];

export function SizingGuideClient({ sizeProfiles, lengthChartData }: SizingGuideClientProps) {
  // Setup standard size profiles from DB or defaults
  const activeProfiles: SizeProfile[] = sizeProfiles && sizeProfiles.length > 0
    ? sizeProfiles.map((p) => ({
        name: p.name,
        description: p.description,
        measurements: [p.thumb, p.index, p.middle, p.ring, p.pinky],
      }))
    : DEFAULT_SIZE_PROFILES;

  // Tab state
  const [activeTab, setActiveTab] = useState<"calculator" | "how-to" | "charts">("charts");
  const [measureTab, setMeasureTab] = useState<"sizing-kit" | "tape-ruler">("sizing-kit");

  // Calculator measurements state [Thumb, Index, Middle, Ring, Pinky]
  const [measurements, setMeasurements] = useState<number[]>(
    FINGERS.map((f) => f.defaultValue)
  );

  const handleMeasurementChange = (index: number, val: number) => {
    const newMeasurements = [...measurements];
    newMeasurements[index] = val;
    setMeasurements(newMeasurements);
  };

  // Sizing Recommendation Logic (from Homepage InteractiveSizing)
  const getFittingRecommendation = () => {
    // 1. Exact Match check
    for (const profile of activeProfiles) {
      const isExact = profile.measurements.every((m, idx) => m === measurements[idx]);
      if (isExact) {
        return {
          type: "exact" as const,
          profileName: profile.name,
          profileDesc: profile.description,
          details: `Perfect fit! The standard ${profile.name} set matches your measurements exactly. No filing required.`,
        };
      }
    }

    // 2. Find eligible standard sizes (standard_mm >= user_mm for all fingers)
    const eligibleProfiles = activeProfiles.map((profile) => {
      let isEligible = true;
      let totalWaste = 0;
      const fingerDiffs = profile.measurements.map((stdVal, idx) => {
        const userVal = measurements[idx];
        const diff = stdVal - userVal;
        if (diff < 0) isEligible = false; // Standard is too small for this finger
        totalWaste += diff;
        return diff;
      });

      return {
        profile,
        isEligible,
        totalWaste,
        fingerDiffs,
      };
    }).filter((item) => item.isEligible);

    // Sort by lowest waste
    eligibleProfiles.sort((a, b) => a.totalWaste - b.totalWaste);

    if (eligibleProfiles.length > 0) {
      const bestFit = eligibleProfiles[0];
      
      // If total filing needed is low (<= 3mm total across all 5 fingers), recommend it with filing advice
      if (bestFit.totalWaste <= 3) {
        return {
          type: "near-match" as const,
          profileName: bestFit.profile.name,
          profileDesc: bestFit.profile.description,
          details: `Closest standard size: ${bestFit.profile.name}. The nails will cover your nail beds fully. You will need to lightly file down some edges (total of ${bestFit.totalWaste}mm across all fingers) for a tailored fit.`,
          fingerDiffs: bestFit.fingerDiffs,
        };
      } else {
        // Usable but requires too much filing (tedious and ruins nail art shape)
        return {
          type: "custom-recommended" as const,
          profileName: bestFit.profile.name,
          profileDesc: bestFit.profile.description,
          details: `While the standard ${bestFit.profile.name} set is large enough, it requires significant filing (${bestFit.totalWaste}mm total) which can distort the handcrafted nail art. We recommend ordering a Custom Size instead.`,
          fingerDiffs: bestFit.fingerDiffs,
        };
      }
    }

    // 3. No standard size is large enough (user's nails exceed standard limits)
    return {
      type: "out-of-range" as const,
      profileName: "Custom Size",
      profileDesc: "Unique measurements",
      details: "Your measurements exceed standard profiles. Select 'Custom Size' on any product page and specify your exact widths at checkout for a bespoke set.",
    };
  };

  const recommendation = getFittingRecommendation();

  return (
    <div className="bg-background min-h-screen py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs uppercase tracking-widest text-primary font-bold bg-primary/10 px-3.5 py-1.5 rounded-full">
            Fit Guide & Calculator
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl font-normal text-foreground mt-3 tracking-wide">
            Snail Studio Size Guide
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground font-light leading-relaxed max-w-2xl mx-auto">
            Press-on nails offer a salon-quality manicure in minutes. Use our smart simulator to calculate your size profile, learn how to measure at home, or browse standard guides.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex justify-center border-b border-border/30 max-w-xl mx-auto">
          <div className="flex w-full justify-between">
            <button
              onClick={() => setActiveTab("charts")}
              className={`pb-4 text-xs font-semibold uppercase tracking-widest transition-all relative w-1/3 flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "charts"
                  ? "text-primary font-bold border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Scale className="w-4 h-4" />
              Sizing Charts
            </button>
            <button
              onClick={() => setActiveTab("how-to")}
              className={`pb-4 text-xs font-semibold uppercase tracking-widest transition-all relative w-1/3 flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "how-to"
                  ? "text-primary font-bold border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Ruler className="w-4 h-4" />
              How to Measure
            </button>
            <button
              onClick={() => setActiveTab("calculator")}
              className={`pb-4 text-xs font-semibold uppercase tracking-widest transition-all relative w-1/3 flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "calculator"
                  ? "text-primary font-bold border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Size Calculator
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="max-w-6xl mx-auto">
          
          {/* TAB 1: SIZE CALCULATOR */}
          {activeTab === "calculator" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center bg-secondary/35 border border-border/40 rounded-3xl p-6 sm:p-10 shadow-xs">
              {/* Sliders on Left */}
              <div className="lg:col-span-6 space-y-6">
                <div>
                  <h3 className="font-serif text-lg text-foreground font-medium mb-1">
                    Select Your Finger Widths
                  </h3>
                  <p className="text-xs text-muted-foreground font-light leading-relaxed">
                    Adjust the sliders to match your measured nail widths. Sliders are locked to anatomically realistic ranges.
                  </p>
                </div>

                <div className="space-y-5">
                  {FINGERS.map((finger, idx) => (
                    <div key={finger.name} className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-foreground">{finger.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Size {mmToSizeNum(measurements[idx])}
                          </span>
                          <span className="text-primary font-mono font-semibold bg-background border border-border/30 px-2 py-0.5 rounded-md">
                            {measurements[idx]} mm
                          </span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={finger.min}
                        max={finger.max}
                        step="0.5"
                        value={measurements[idx]}
                        onChange={(e) => handleMeasurementChange(idx, parseFloat(e.target.value))}
                        className="w-full accent-primary h-1 bg-border/40 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-muted-foreground/60 px-1 font-mono">
                        <span>{finger.min}mm</span>
                        <span>{finger.max}mm</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Size Card on Right */}
              <div className="lg:col-span-6 bg-card border border-border/40 rounded-2xl p-6 sm:p-8 flex flex-col justify-between h-full space-y-6 relative overflow-hidden shadow-xs">
                {/* Decorative glow */}
                <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-accent/10 blur-xl pointer-events-none" />

                <div className="space-y-4">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-light block">
                    Fitting Recommendation
                  </span>
                  
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-muted-foreground font-light">Recommended Size:</span>
                      <span className="font-serif text-3xl font-semibold text-primary">{recommendation.profileName}</span>
                    </div>
                    {recommendation.profileDesc && (
                      <span className="text-xs text-muted-foreground font-light block">
                        ({recommendation.profileDesc})
                      </span>
                    )}
                  </div>

                  {/* Recommendation Alert Box */}
                  {recommendation.type === "exact" && (
                    <div className="flex gap-2.5 items-start text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-950/40">
                      <Check className="w-4 h-4 stroke-[2.5] flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>{recommendation.details}</strong>
                      </div>
                    </div>
                  )}

                  {recommendation.type === "near-match" && (
                    <div className="flex gap-2.5 items-start text-xs text-amber-700 bg-amber-50/50 dark:bg-amber-950/20 dark:text-amber-400 p-3.5 rounded-xl border border-amber-100/40 dark:border-amber-950/40">
                      <AlertCircle className="w-4 h-4 stroke-[2.5] flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Standard Fit Usable (Recommended):</strong> {recommendation.details}
                      </div>
                    </div>
                  )}

                  {(recommendation.type === "custom-recommended" || recommendation.type === "out-of-range") && (
                    <div className="flex gap-2.5 items-start text-xs text-rose-600 bg-rose-50/50 dark:bg-rose-950/20 dark:text-rose-400 p-3.5 rounded-xl border border-rose-100 dark:border-rose-950/40">
                      <AlertCircle className="w-4 h-4 stroke-[2.5] flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Bespoke Sizing Advised:</strong> {recommendation.details}
                      </div>
                    </div>
                  )}
                </div>

                {/* Match Comparison List */}
                <div className="space-y-3">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold block">
                    Finger-by-Finger Comparison
                  </span>
                  <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
                    {FINGERS.map((finger, idx) => {
                      const userVal = measurements[idx];
                      const stdVal = recommendation.type !== "out-of-range" 
                        ? activeProfiles.find(p => p.name === recommendation.profileName)?.measurements[idx] || userVal
                        : userVal;
                      
                      const diff = stdVal - userVal;

                      return (
                        <div key={finger.name} className="p-2 rounded-lg bg-secondary/50 border border-border/20 space-y-1">
                          <span className="text-muted-foreground block text-[9px] truncate">{finger.name}</span>
                          <span className="font-semibold text-foreground font-mono block">{userVal}mm</span>
                          
                          {recommendation.type === "out-of-range" ? (
                            <span className="font-mono text-[8px] font-bold block text-rose-500">Custom</span>
                          ) : (
                            <span className={`font-mono text-[8px] font-bold block ${
                              diff === 0 
                                ? "text-emerald-600 font-semibold" 
                                : diff > 0 
                                  ? "text-amber-600" 
                                  : "text-rose-600"
                            }`}>
                              {diff === 0 ? "Match" : diff > 0 ? `+${diff}mm` : `${diff}mm`}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  {recommendation.type === "out-of-range" || recommendation.type === "custom-recommended" ? (
                    <Link
                      href="/shop"
                      className="w-full inline-flex items-center justify-center py-3 rounded-full text-xs font-semibold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm transition-all"
                    >
                      Shop Custom Size Sets <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Link>
                  ) : (
                    <Link
                      href="/shop"
                      className="w-full inline-flex items-center justify-center py-3 rounded-full text-xs font-semibold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm transition-all"
                    >
                      Shop Standard {recommendation.profileName} Sets <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HOW TO MEASURE */}
          {activeTab === "how-to" && (
            <div className="space-y-12">
              {/* Option Selector Toggle */}
              <div className="flex justify-center">
                <div className="bg-secondary/45 border border-border/30 p-1.5 rounded-2xl flex max-w-md w-full">
                  <button
                    onClick={() => setMeasureTab("sizing-kit")}
                    className={`flex-1 py-3 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center ${
                      measureTab === "sizing-kit"
                        ? "bg-card text-primary shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Option 1: Sizing Kit (100% Fit Guarantee)
                  </button>
                  <button
                    onClick={() => setMeasureTab("tape-ruler")}
                    className={`flex-1 py-3 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center ${
                      measureTab === "tape-ruler"
                        ? "bg-card text-primary shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Option 2: Measure At Home
                  </button>
                </div>
              </div>

              {/* Sizing Kit Guide */}
              {measureTab === "sizing-kit" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-card border border-border/40 rounded-3xl p-6 sm:p-10 shadow-xs">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <span className="text-xs uppercase tracking-widest text-primary font-bold">Foolproof Fit</span>
                      <h3 className="font-serif text-2xl text-foreground font-medium">
                        Order A Sizing Kit
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground font-light leading-relaxed">
                        The easiest and most accurate way to find your sizing is by ordering a Sizing Kit first. Each kit contains actual clear press-on nails numbered 0 to 11 in your preferred shape (e.g. Almond, Coffin, Square).
                      </p>
                    </div>

                    <ul className="space-y-3.5 text-xs text-muted-foreground font-light">
                      <li className="flex gap-2.5 items-start">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Try on individual clear tips directly on your natural nails.</span>
                      </li>
                      <li className="flex gap-2.5 items-start">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Find the size that fits sidewall-to-sidewall comfortably.</span>
                      </li>
                      <li className="flex gap-2.5 items-start">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Record your sizes from Thumb to Pinky (e.g. 2 - 6 - 5 - 6 - 8).</span>
                      </li>
                      <li className="flex gap-2.5 items-start">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Select standard size profiles (XS, S, M, L) or input custom sizes.</span>
                      </li>
                    </ul>

                    <div className="pt-2">
                      <Link
                        href="/shop"
                        className="inline-flex items-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold uppercase tracking-widest rounded-xl transition-all shadow-sm"
                      >
                        Order Sizing Kit <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>

                  <div className="bg-secondary/15 rounded-2xl p-6 border border-border/30 space-y-4">
                    <h4 className="font-serif text-sm font-semibold text-foreground">Sizing Example Record</h4>
                    <p className="text-xs text-muted-foreground font-light leading-relaxed">
                      Write down your sizing from Thumb to Pinky and save it. You can select "Custom Size" on product pages and input it at checkout:
                    </p>
                    <div className="bg-card border border-border/30 rounded-xl p-4 font-mono text-[11px] text-foreground space-y-2">
                      <div><strong className="text-primary">LEFT HAND:</strong> 2, 6, 5, 6, 9</div>
                      <div><strong className="text-primary">RIGHT HAND:</strong> 2, 6, 5, 7, 9</div>
                    </div>
                    <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl text-[10px] text-muted-foreground flex gap-2">
                      <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>If you are between sizes, we strongly advise sizing up and filing the sides down slightly.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Measure at Home Guide */}
              {measureTab === "tape-ruler" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-card border border-border/40 rounded-3xl p-6 sm:p-10 shadow-xs">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <span className="text-xs uppercase tracking-widest text-primary font-bold">Quick Setup</span>
                      <h3 className="font-serif text-2xl text-foreground font-medium">
                        Tape & Ruler Method
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground font-light leading-relaxed">
                        If you want to measure your nails immediately, you can measure at home with household clear tape, a pen, and a millimeter ruler.
                      </p>
                    </div>

                    <div className="space-y-4 text-xs font-light text-muted-foreground">
                      <div className="flex gap-4">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-serif font-bold text-xs">
                          1
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-semibold text-foreground text-sm">Place Tape</h4>
                          <p className="leading-relaxed">Place a piece of adhesive tape horizontally across the widest part of your natural nail bed, pressing it down firmly into the sidewalls.</p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-serif font-bold text-xs">
                          2
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-semibold text-foreground text-sm">Mark Sidewalls</h4>
                          <p className="leading-relaxed">Using a fine-tip pen, draw marks exactly where your nail bed meets your skin on both sides (the widest point of the nail bed).</p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-serif font-bold text-xs">
                          3
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-semibold text-foreground text-sm">Peel & Measure</h4>
                          <p className="leading-relaxed">Peel the tape off, lay it completely flat next to a millimeter ruler, and measure the distance between the two ink marks in millimeters (mm).</p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-serif font-bold text-xs">
                          4
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-semibold text-foreground text-sm">Record All Fingers</h4>
                          <p className="leading-relaxed">Repeat the steps for all 10 fingers, writing down the widths in millimeters from Thumb to Pinky.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-secondary/15 rounded-2xl p-6 border border-border/30 flex flex-col justify-center space-y-4">
                    <h4 className="font-serif text-sm font-semibold text-foreground">Sizing Fit Advice</h4>
                    <ul className="space-y-3 text-xs text-muted-foreground font-light">
                      <li className="flex gap-2 items-start">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>Measure at the widest part of your natural nail bed, not the tip.</span>
                      </li>
                      <li className="flex gap-2 items-start">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>Ensure the tape lies flat on the ruler without wrinkles.</span>
                      </li>
                      <li className="flex gap-2 items-start">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>Each hand can be slightly different. Write down both hand sizes.</span>
                      </li>
                      <li className="flex gap-2 items-start">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>Always round up to the nearest millimeter if in between measurements.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CHARTS */}
          {activeTab === "charts" && (
            <div className="space-y-12 animate-fade-in">
              {/* Dynamic Standard Size Profiles Chart */}
              <div className="bg-card border border-border/40 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
                <div>
                  <h3 className="font-serif text-lg text-foreground font-medium mb-1">
                    Standard Size Set Profiles
                  </h3>
                  <p className="text-xs text-muted-foreground font-light">
                    Snail Studio offers four standard pre-sized sets (XS, S, M, L). If these match your measurements, you can select standard sizing on any product page.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-light">
                    <thead>
                      <tr className="border-b border-border/40 text-foreground font-semibold bg-secondary/15">
                        <th className="py-4 px-4 rounded-tl-xl">Size Profile</th>
                        <th className="py-4 px-4 text-center">Thumb</th>
                        <th className="py-4 px-4 text-center">Index</th>
                        <th className="py-4 px-4 text-center">Middle</th>
                        <th className="py-4 px-4 text-center">Ring</th>
                        <th className="py-4 px-4 text-center rounded-tr-xl">Pinky</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20 text-muted-foreground font-mono">
                      {activeProfiles.map((profile) => (
                        <tr
                          key={profile.name}
                          className="hover:bg-primary/5 hover:text-foreground transition-colors"
                        >
                          <td className="py-4 px-4 font-semibold text-primary font-sans">
                            {profile.name} ({profile.description})
                          </td>
                          {profile.measurements.map((m, idx) => (
                            <td key={idx} className="py-4 px-4 text-center">
                              {m} mm (Size {mmToSizeNum(m)})
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dynamic Length Chart by Shape (Admin-Managed) */}
              <div className="bg-card border border-border/40 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
                <div>
                  <h3 className="font-serif text-lg text-foreground font-medium mb-1">
                    Shape Length Guide Chart
                  </h3>
                  <p className="text-xs text-muted-foreground font-light">
                    Nail lengths vary based on your selected shape. This chart details the length in millimeters for each shape and size profile, managed dynamically by our studio.
                  </p>
                </div>

                {lengthChartData && lengthChartData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-light">
                      <thead>
                        <tr className="border-b border-border/40 text-foreground font-semibold bg-secondary/15">
                          <th className="py-4 px-4 rounded-tl-xl">Nail Shapes</th>
                          <th className="py-4 px-4 text-center">XS Length</th>
                          <th className="py-4 px-4 text-center">S Length</th>
                          <th className="py-4 px-4 text-center">M Length</th>
                          <th className="py-4 px-4 text-center rounded-tr-xl">L Length</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20 text-muted-foreground font-mono">
                        {lengthChartData.map((row) => (
                          <tr
                            key={row.id}
                            className="hover:bg-primary/5 hover:text-foreground transition-colors"
                          >
                            <td className="py-4 px-4 font-semibold text-primary font-sans">{row.shape}</td>
                            <td className="py-4 px-4 text-center">{row.xs}</td>
                            <td className="py-4 px-4 text-center">{row.s}</td>
                            <td className="py-4 px-4 text-center">{row.m}</td>
                            <td className="py-4 px-4 text-center">{row.l}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-secondary/20 text-center rounded-xl text-xs text-muted-foreground">
                    No shape length configuration found. Set default ranges.
                  </div>
                )}
              </div>

              {/* Full Width-to-Size Conversion Chart */}
              <div className="bg-card border border-border/40 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
                <div>
                  <h3 className="font-serif text-lg text-foreground font-medium mb-1">
                    Full Width-to-Size-Number Conversion Chart
                  </h3>
                  <p className="text-xs text-muted-foreground font-light">
                    Every press-on nail is numbered (0 to 14) which corresponds to specific widths in millimeters at the widest point:
                  </p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-3 font-mono text-[11px]">
                  {NAIL_SIZE_MAP.map((item) => (
                    <div
                      key={item.size}
                      className="bg-secondary/20 border border-border/20 rounded-xl p-3 text-center space-y-1.5 hover:border-primary/30 transition-all hover:scale-[1.02]"
                    >
                      <span className="text-[10px] text-muted-foreground block">Size {item.size}</span>
                      <strong className="text-primary text-sm block">{item.mm} mm</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
export default SizingGuideClient;
