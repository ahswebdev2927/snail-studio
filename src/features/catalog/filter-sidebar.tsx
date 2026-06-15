"use client";

import { FacetOption, AttributeFacet } from "@/services/search/product-search.service";
import { ChevronDown, RotateCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";

export interface FilterState {
  category?: string;
  brand?: string[];
  shape?: string[];
  length?: string[];
  colour?: string[];
  texture?: string[];
  minPrice?: number;
  maxPrice?: number;
  availability?: "in_stock";
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
}

export function FilterSidebar({ facets, filters, onChange, onClear }: FilterSidebarProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    categories: true,
    brands: true,
    price: true,
    availability: true,
    shapes: true,
    lengths: true,
    colours: true,
    textures: true,
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

  const handleAvailabilityToggle = () => {
    onChange({
      ...filters,
      availability: filters.availability ? undefined : "in_stock",
    });
  };

  // Safe checks for rendering facets
  const categoriesList = facets?.categories || [];
  const brandsList = facets?.brands || [];
  const attributesList = facets?.attributes || [];
  
  const shapesFacet = attributesList.find(a => a.groupCode === "shape");
  const lengthsFacet = attributesList.find(a => a.groupCode === "length");
  const coloursFacet = attributesList.find(a => a.groupCode === "colour");
  const texturesFacet = attributesList.find(a => a.groupCode === "texture");

  const activeFiltersCount = 
    (filters.category ? 1 : 0) +
    (filters.brand?.length || 0) +
    (filters.shape?.length || 0) +
    (filters.length?.length || 0) +
    (filters.colour?.length || 0) +
    (filters.texture?.length || 0) +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0) +
    (filters.availability ? 1 : 0);

  return (
    <div className="w-full space-y-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/40">
        <h2 className="text-base font-semibold uppercase tracking-wider text-foreground">Filters</h2>
        {activeFiltersCount > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear ({activeFiltersCount})
          </button>
        )}
      </div>

      {/* Stock Availability */}
      <div className="border-b border-border/20 pb-5">
        <div className="flex items-center justify-between py-2 cursor-pointer" onClick={() => toggleSection("availability")}>
          <h3 className="text-sm font-medium text-foreground">Availability</h3>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${openSections.availability ? "rotate-180" : ""}`} />
        </div>
        {openSections.availability && (
          <div className="mt-3">
            <label className="flex items-center gap-2.5 text-sm text-foreground/80 hover:text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={filters.availability === "in_stock"}
                onChange={handleAvailabilityToggle}
                className="w-4 h-4 rounded text-primary border-border focus:ring-primary/20 accent-primary cursor-pointer"
              />
              In Stock Only
            </label>
          </div>
        )}
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
                    <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">{cat.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Brands Accordion */}
      {brandsList.length > 0 && (
        <div className="border-b border-border/20 pb-5">
          <div className="flex items-center justify-between py-2 cursor-pointer" onClick={() => toggleSection("brands")}>
            <h3 className="text-sm font-medium text-foreground">Brands</h3>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${openSections.brands ? "rotate-180" : ""}`} />
          </div>
          {openSections.brands && (
            <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
              {brandsList.map((brand) => (
                <label key={brand.id} className="flex items-center justify-between text-sm text-foreground/85 hover:text-foreground cursor-pointer py-0.5">
                  <span className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={filters.brand?.includes(brand.slug) || false}
                      onChange={() => handleCheckboxToggle("brand", brand.slug)}
                      className="w-4 h-4 rounded text-primary border-border focus:ring-primary/20 accent-primary cursor-pointer"
                    />
                    {brand.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">({brand.count})</span>
                </label>
              ))}
            </div>
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
          <div className="mt-3 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex-1">
                <span className="text-[10px] text-muted-foreground/60 block mb-1">Min Price</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice !== undefined ? Math.floor(filters.minPrice / 100) : ""}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) * 100 : undefined;
                    handlePriceChange(val, filters.maxPrice);
                  }}
                  className="w-full text-sm bg-secondary/20 border border-border/30 rounded-md py-1.5 px-2.5 outline-none focus:border-primary/50 text-foreground"
                />
              </div>
              <div className="flex-1">
                <span className="text-[10px] text-muted-foreground/60 block mb-1">Max Price</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice !== undefined ? Math.floor(filters.maxPrice / 100) : ""}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) * 100 : undefined;
                    handlePriceChange(filters.minPrice, val);
                  }}
                  className="w-full text-sm bg-secondary/20 border border-border/30 rounded-md py-1.5 px-2.5 outline-none focus:border-primary/50 text-foreground"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Shapes (Toggle Pills) */}
      {shapesFacet && shapesFacet.values.length > 0 && (
        <div className="border-b border-border/20 pb-5">
          <div className="flex items-center justify-between py-2 cursor-pointer" onClick={() => toggleSection("shapes")}>
            <h3 className="text-sm font-medium text-foreground">Nail Shape</h3>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${openSections.shapes ? "rotate-180" : ""}`} />
          </div>
          {openSections.shapes && (
            <div className="mt-3 flex flex-wrap gap-2">
              {shapesFacet.values.map((v) => {
                const isSelected = filters.shape?.includes(v.code) || false;
                return (
                  <button
                    key={v.code}
                    onClick={() => handleCheckboxToggle("shape", v.code)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground shadow-sm font-medium"
                        : "bg-secondary/20 hover:bg-secondary/40 border-border/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {v.value} ({v.count})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Lengths (Toggle Pills) */}
      {lengthsFacet && lengthsFacet.values.length > 0 && (
        <div className="border-b border-border/20 pb-5">
          <div className="flex items-center justify-between py-2 cursor-pointer" onClick={() => toggleSection("lengths")}>
            <h3 className="text-sm font-medium text-foreground">Nail Length</h3>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${openSections.lengths ? "rotate-180" : ""}`} />
          </div>
          {openSections.lengths && (
            <div className="mt-3 flex flex-wrap gap-2">
              {lengthsFacet.values.map((v) => {
                const isSelected = filters.length?.includes(v.code) || false;
                return (
                  <button
                    key={v.code}
                    onClick={() => handleCheckboxToggle("length", v.code)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground shadow-sm font-medium"
                        : "bg-secondary/20 hover:bg-secondary/40 border-border/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {v.value} ({v.count})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Colours (Toggle Pills with Swatch hints) */}
      {coloursFacet && coloursFacet.values.length > 0 && (
        <div className="border-b border-border/20 pb-5">
          <div className="flex items-center justify-between py-2 cursor-pointer" onClick={() => toggleSection("colours")}>
            <h3 className="text-sm font-medium text-foreground">Color</h3>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${openSections.colours ? "rotate-180" : ""}`} />
          </div>
          {openSections.colours && (
            <div className="mt-3 flex flex-wrap gap-2">
              {coloursFacet.values.map((v) => {
                const isSelected = filters.colour?.includes(v.code) || false;
                
                // Luxury dynamic dot mapping
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
                    onClick={() => handleCheckboxToggle("colour", v.code)}
                    className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground shadow-sm font-medium"
                        : "bg-secondary/20 hover:bg-secondary/40 border-border/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${colorHexes[v.code] || "bg-secondary-foreground/30"}`} />
                    {v.value} ({v.count})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Textures */}
      {texturesFacet && texturesFacet.values.length > 0 && (
        <div className="pb-5">
          <div className="flex items-center justify-between py-2 cursor-pointer" onClick={() => toggleSection("textures")}>
            <h3 className="text-sm font-medium text-foreground">Finish / Texture</h3>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${openSections.textures ? "rotate-180" : ""}`} />
          </div>
          {openSections.textures && (
            <div className="mt-3 flex flex-wrap gap-2">
              {texturesFacet.values.map((v) => {
                const isSelected = filters.texture?.includes(v.code) || false;
                return (
                  <button
                    key={v.code}
                    onClick={() => handleCheckboxToggle("texture", v.code)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground shadow-sm font-medium"
                        : "bg-secondary/20 hover:bg-secondary/40 border-border/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {v.value} ({v.count})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
