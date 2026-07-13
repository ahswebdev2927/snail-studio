"use client";

import React, { useState } from "react";
import { Ruler, Scale, Check, HelpCircle, ArrowRight, AlertCircle } from "lucide-react";
import Link from "next/link";

interface SizeProfile {
  name: string;
  description: string;
  measurements: number[]; // [Thumb, Index, Middle, Ring, Pinky] in mm
}

const SIZE_PROFILES: SizeProfile[] = [
  { name: "XS", description: "Petite hands", measurements: [14, 10, 11, 10, 8] },
  { name: "S", description: "Small hands", measurements: [15, 11, 12, 11, 9] },
  { name: "M", description: "Average / Standard hands", measurements: [16, 12, 13, 12, 10] },
  { name: "L", description: "Larger hands", measurements: [18, 13, 14, 13, 11] },
];

const FINGERS = [
  { name: "Thumb", min: 13, max: 19, defaultValue: 16 },
  { name: "Index", min: 9, max: 15, defaultValue: 12 },
  { name: "Middle", min: 10, max: 16, defaultValue: 13 },
  { name: "Ring", min: 9, max: 15, defaultValue: 12 },
  { name: "Pinky", min: 7, max: 12, defaultValue: 10 },
];

// Map millimeters to standard industry press-on nail numbers (0 to 9)
function mmToNailSizeNumber(mm: number): string {
  if (mm >= 18) return "0";
  if (mm === 17) return "1";
  if (mm === 16) return "2";
  if (mm === 15) return "3";
  if (mm === 14) return "4";
  if (mm === 13) return "5";
  if (mm === 12) return "6";
  if (mm === 11) return "7";
  if (mm === 10) return "8";
  if (mm === 9) return "9";
  if (mm === 8) return "10";
  return "11";
}

interface InteractiveSizingProps {
  sizeProfiles?: {
    id: string;
    name: string;
    description: string;
    thumb: number;
    index: number;
    middle: number;
    ring: number;
    pinky: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }[];
}

export function InteractiveSizing({ sizeProfiles: dbSizeProfiles }: InteractiveSizingProps = {}) {
  const activeProfiles: SizeProfile[] = dbSizeProfiles && dbSizeProfiles.length > 0
    ? dbSizeProfiles.map((p) => ({
        name: p.name,
        description: p.description,
        measurements: [p.thumb, p.index, p.middle, p.ring, p.pinky],
      }))
    : SIZE_PROFILES;

  const [activeTab, setActiveTab] = useState<"calculator" | "chart" | "guide">("chart");
  const [measurements, setMeasurements] = useState<number[]>(
    FINGERS.map((f) => f.defaultValue)
  );

  const handleMeasurementChange = (index: number, val: number) => {
    const newMeasurements = [...measurements];
    newMeasurements[index] = val;
    setMeasurements(newMeasurements);
  };

  // Professional Press-on Fitting Recommendation Algorithm:
  // 1. A nail set size is only usable if standard_mm >= user_mm for all fingers (we can only file down, never stretch up).
  // 2. We rank all usable profiles by the total extra width (waste) in mm. The profile with the least waste is recommended.
  // 3. If no standard profile is fully >= user measurements, or if the total filing required is > 3mm, we recommend Custom Sizing.
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
    <section id="sizing" className="py-20 bg-background border-t border-border/20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="text-xs uppercase tracking-widest text-primary font-bold">Perfect Fit Guaranteed</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-foreground mt-2">
            Nail Size Calculator
          </h2>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            Standard size press-ons (XS, S, M, L) fit most hands, but custom sizes ensure a perfect look. Use our smart simulator to find your custom fit.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex justify-center border-b border-border/30 max-w-md mx-auto">
          <div className="flex w-full justify-between">
            <button
              onClick={() => setActiveTab("chart")}
              className={`pb-4 text-xs font-semibold uppercase tracking-widest transition-all relative w-1/3 flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "chart"
                  ? "text-primary font-bold border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Ruler className="w-4 h-4" />
              Size Chart
            </button>
            <button
              onClick={() => setActiveTab("guide")}
              className={`pb-4 text-xs font-semibold uppercase tracking-widest transition-all relative w-1/3 flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "guide"
                  ? "text-primary font-bold border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <HelpCircle className="w-4 h-4" />
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
              <Scale className="w-4 h-4" />
              Calculator
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="max-w-5xl mx-auto">
          
          {/* TAB 1: CALCULATOR */}
          {activeTab === "calculator" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center bg-secondary/35 border border-border/40 rounded-3xl p-6 sm:p-10 shadow-xs">
              {/* Sliders on Left */}
              <div className="lg:col-span-6 space-y-6">
                <div>
                  <h3 className="font-serif text-lg text-foreground font-medium mb-1">
                    Select Your Finger Widths
                  </h3>
                  <p className="text-xs text-muted-foreground font-light">
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
                            Size {mmToNailSizeNumber(measurements[idx])}
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
                        value={measurements[idx]}
                        onChange={(e) => handleMeasurementChange(idx, parseInt(e.target.value))}
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

          {/* TAB 2: CHART */}
          {activeTab === "chart" && (
            <div className="bg-secondary/25 border border-border/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs animate-fade-in">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-light">
                  <thead>
                    <tr className="border-b border-border/40 text-foreground font-semibold">
                      <th className="py-4 px-4">Size Profile</th>
                      <th className="py-4 px-4">Thumb</th>
                      <th className="py-4 px-4">Index</th>
                      <th className="py-4 px-4">Middle</th>
                      <th className="py-4 px-4">Ring</th>
                      <th className="py-4 px-4">Pinky</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 text-muted-foreground font-mono">
                    {activeProfiles.map((profile) => (
                      <tr 
                        key={profile.name}
                        className={`hover:bg-primary/5 hover:text-foreground transition-colors ${
                          recommendation.profileName === profile.name ? "bg-primary/5 text-foreground font-medium" : ""
                        }`}
                      >
                        <td className="py-4 px-4 font-semibold text-primary font-sans">{profile.name} ({profile.description})</td>
                        {profile.measurements.map((m, idx) => (
                          <td key={idx} className="py-4 px-4">{m} mm (Size {mmToNailSizeNumber(m)})</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/30 text-[11px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground font-semibold">Filing Rule:</strong> If your finger measurements are slightly smaller than a standard profile (e.g. 1mm difference on 1-2 fingers), it is highly recommended to purchase that standard profile size and gently file the sides of the press-ons before application. Snail Studio kits include a mini file for this exact purpose.
              </div>
            </div>
          )}

          {/* TAB 3: HOW TO MEASURE */}
          {activeTab === "guide" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
              
              {/* Method 1 */}
              <div className="bg-card border border-border/30 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-serif font-bold text-sm">
                  1
                </div>
                <h3 className="font-serif text-lg text-foreground font-medium">
                  Tape & Ruler Method
                </h3>
                <p className="text-xs text-muted-foreground font-light leading-relaxed">
                  Place a piece of adhesive tape horizontally across the widest part of your natural nail bed. Mark the edges of your nail walls with a pen, peel the tape off, and place it flat next to a metric ruler. Measure the distance in millimeters (mm).
                </p>
                <div className="pt-2 font-mono text-[10px] flex gap-2">
                  <span className="bg-secondary/10 text-secondary px-2.5 py-1 rounded-md border border-secondary/20">Widest Part Only</span>
                  <span className="bg-secondary/10 text-secondary px-2.5 py-1 rounded-md border border-secondary/20">Measure flat (mm)</span>
                </div>
              </div>

              {/* Method 2 */}
              <div className="bg-card border border-border/30 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-serif font-bold text-sm">
                  2
                </div>
                <h3 className="font-serif text-lg text-foreground font-medium">
                  Order a Sizing Kit
                </h3>
                <p className="text-xs text-muted-foreground font-light leading-relaxed">
                  For a 100% guarantee on your custom fit, order a Sizing Kit in your preferred shape (Coffin, Stiletto, Almond, or Square). It includes actual clear nails in sizes 0 to 11 so you can find your exact matches directly.
                </p>
                <div className="pt-2 flex gap-4">
                  <Link
                    href="/shop"
                    className="inline-flex items-center text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Order Sizing Kit <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Full Size Guide Page Link */}
        <div className="text-center pt-8">
          <Link
            href="/sizing-guide"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs font-semibold uppercase tracking-widest rounded-full transition-all duration-300 shadow-xs hover:shadow-sm cursor-pointer"
          >
            Explore Detailed Sizing & Shape Guide
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </section>
  );
}

export default InteractiveSizing;
