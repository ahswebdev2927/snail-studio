"use client";

import { FacetOption, AttributeFacet } from "@/services/search/product-search.service";
import { ChevronDown, RotateCcw, ShieldCheck, SlidersHorizontal, EyeOff } from "lucide-react";
import { useState } from "react";
import { RangeSlider } from "@/components/ui/slider";

export interface FilterState {
  category?: string;
  collection?: string;
  brand?: string[];
  shape?: string[];
  length?: string[];
  colour?: string[];
  texture?: string[];
  style?: string[];
  occasion?: string[];
  minPrice?: number;
  maxPrice?: number;
  availability?: "in_stock";
  rating?: number;
  [key: string]: string[] | string | number | undefined;
}

interface FilterSidebarProps {
  facets?: {
    categories: FacetOption[];
    brands: FacetOption[];
    attributes: AttributeFacet[];
    priceRange: { min: number; max: number };
  };
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClear: () => void;
  onToggleHide?: () => void;
}

export function FilterSidebar({ facets, filters, onChange, onClear, onToggleHide }: FilterSidebarProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    categories: true,
    brands: true,
    price: true,
    shapes: true,
    lengths: true,
    colours: true,
    textures: true,
    style: true,
    occasion: true,
    rating: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCheckboxToggle = (field: keyof FilterState, code: string) => {
    const current = (filters[field] as string[]) || [];
    const updated = current.includes(code)
      ? current.filter((x) => x !== code)
      : [...current, code];
    
    onChange({
      ...filters,
      [field]: updated.length > 0 ? updated : undefined,
    });
  };

  const handleCategorySelect = (slug: string) => {
    onChange({
      ...filters,
      category: filters.category === slug ? undefined : slug,
    });
  };

  const handlePriceChange = (min?: number, max?: number) => {
    onChange({
      ...filters,
      minPrice: min,
      maxPrice: max,
    });
  };

  // Dynamic price limits in Rupees calculated from database search facets
  const dbMin = facets?.priceRange ? Math.floor(facets.priceRange.min / 100) : 0;
  const dbMax = facets?.priceRange ? Math.ceil(facets.priceRange.max / 100) : 10000;
  const priceMinLimit = dbMin;
  const priceMaxLimit = dbMax > dbMin ? dbMax : dbMin + 100;

  const currentMin = filters.minPrice !== undefined ? Math.floor(filters.minPrice / 100) : priceMinLimit;
  const currentMax = filters.maxPrice !== undefined ? Math.ceil(filters.maxPrice / 100) : priceMaxLimit;

  const handleSliderChange = (minVal: number, maxVal: number) => {
    const minPrice = minVal === priceMinLimit ? undefined : minVal * 100;
    const maxPrice = maxVal === priceMaxLimit ? undefined : maxVal * 100;
    handlePriceChange(minPrice, maxPrice);
  };



  // Safe checks for rendering facets
  const categoriesList = facets?.categories || [];
  const brandsList = facets?.brands || [];
  const attributesList = facets?.attributes || [];
  


  const activeFiltersCount = 
    (filters.category ? 1 : 0) +
    (filters.brand?.length || 0) +
    (filters.shape?.length || 0) +
    (filters.length?.length || 0) +
    (filters.colour?.length || 0) +
    (filters.texture?.length || 0) +
    (filters.style?.length || 0) +
    (filters.occasion?.length || 0) +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0) +
    (filters.rating ? 1 : 0);

  return (
    <div className="w-full space-y-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          {onToggleHide ? (
            <button
              onClick={onToggleHide}
              className="flex items-center gap-2 group cursor-pointer text-left focus:outline-none"
              title="Click to hide filters sidebar"
            >
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <h2 className="text-base font-semibold uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">
                Filters
              </h2>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-semibold uppercase tracking-wider text-foreground">
                Filters
              </h2>
            </div>
          )}
          {activeFiltersCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {activeFiltersCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
          {onToggleHide && (
            <button
              onClick={onToggleHide}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/20 transition-colors cursor-pointer"
              title="Hide Filters"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>



      {/* Categories Accordion */}
      {categoriesList.length > 0 && (
        <div className="border-b border-border/20 pb-5">
          <div className="flex items-center justify-between py-2 cursor-pointer" onClick={() => toggleSection("categories")}>
            <h3 className="text-sm font-medium text-foreground">Categories</h3>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${openSections.categories ? "rotate-180" : ""}`} />
          </div>
          {openSections.categories && (
            <ul className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
              {categoriesList.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => handleCategorySelect(cat.slug)}
                    className={`w-full flex items-center justify-between text-left text-sm py-1 px-2 rounded-md transition-all duration-300 cursor-pointer ${
                      filters.category === cat.slug
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-secondary/20 hover:text-foreground"
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="text-[10px] bg-secondary/15 px-1.5 py-0.5 rounded text-secondary border border-secondary/20 font-medium">{cat.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}


      {/* Price Accordion */}
      <div className="border-b border-border/20 pb-5">
        <div className="flex items-center justify-between py-2 cursor-pointer" onClick={() => toggleSection("price")}>
          <h3 className="text-sm font-medium text-foreground">Price (INR)</h3>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${openSections.price ? "rotate-180" : ""}`} />
        </div>
        {openSections.price && (
          <div className="mt-3 space-y-4 px-1 pb-1">
            <RangeSlider
              min={priceMinLimit}
              max={priceMaxLimit}
              valueMin={currentMin}
              valueMax={currentMax}
              onChange={handleSliderChange}
            />
          </div>
        )}
      </div>

      {/* Dynamic Attribute Filter Accordions */}
      {attributesList.map((facet) => {
        const groupCode = facet.groupCode;
        const groupName = facet.groupName;
        const isOpen = openSections[groupCode] ?? true;

        return (
          <div key={groupCode} className="border-b border-border/20 pb-5">
            <div className="flex items-center justify-between py-2 cursor-pointer" onClick={() => toggleSection(groupCode)}>
              <h3 className="text-sm font-medium text-foreground">{groupName}</h3>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </div>
            {isOpen && (
              <div className="mt-3 flex flex-wrap gap-2">
                {facet.values.map((v) => {
                  const isSelected = (filters[groupCode] as string[])?.includes(v.code) || false;
                  const isColourGroup = groupCode === "colour";
                  const colorHexes: Record<string, string> = {
                    pink: "bg-pink-300",
                    nude: "bg-amber-100",
                    red: "bg-red-500",
                    blue: "bg-blue-400",
                    white: "bg-slate-50 border border-slate-300",
                    black: "bg-neutral-900 border border-neutral-700",
                  };

                  return (
                    <button
                      key={v.code}
                      onClick={() => handleCheckboxToggle(groupCode, v.code)}
                      className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300 cursor-pointer ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground shadow-sm font-medium"
                          : "bg-secondary/20 hover:bg-secondary/40 border-border/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {isColourGroup && (
                        <span className={`w-2.5 h-2.5 rounded-full ${colorHexes[v.code] || "bg-secondary-foreground/30"}`} />
                      )}
                      {v.value} ({v.count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Rating Filter */}
      <div className="pb-5">
        <div className="flex items-center justify-between py-2 cursor-pointer" onClick={() => toggleSection("rating")}>
          <h3 className="text-sm font-medium text-foreground">Customer Rating</h3>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${openSections.rating ? "rotate-180" : ""}`} />
        </div>
        {openSections.rating && (
          <div className="mt-3 space-y-2">
            {[4, 3, 2].map((stars) => {
              const isSelected = filters.rating === stars;
              return (
                <button
                  key={stars}
                  onClick={() => {
                    onChange({
                      ...filters,
                      rating: isSelected ? undefined : stars,
                    });
                  }}
                  className={`w-full flex items-center justify-between text-left text-sm py-1.5 px-2.5 rounded-md transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-secondary/20 hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="flex items-center text-amber-400">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <svg
                          key={idx}
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className={`w-3.5 h-3.5 ${idx < stars ? "fill-amber-400" : "fill-border/40"}`}
                        >
                          <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.6 3.102-1.196 4.657c-.21.817.682 1.465 1.39.998l4.056-2.67 4.056 2.67c.708.467 1.6-.18 1.39-.998l-1.196-4.657 3.6-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                        </svg>
                      ))}
                    </span>
                    <span className="text-xs text-foreground/80">& Up</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
