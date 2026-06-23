"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { FilterSidebar, FilterState } from "@/features/catalog/filter-sidebar";
import { FilterDrawer } from "@/features/catalog/filter-drawer";
import { SearchBar } from "@/features/catalog/search-bar";
import { SearchResults } from "@/features/catalog/search-results";
import { SearchPagination } from "@/features/catalog/search-pagination";
import { SearchEmptyState } from "@/features/catalog/search-empty-state";
import { SlidersHorizontal, ArrowUpDown, X } from "lucide-react";

// Helper to compile search filters into query string
function buildQueryString(filters: FilterState, q: string, page: number, sort: string) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (filters.category) params.set("category", filters.category);
  if (filters.availability) params.set("availability", filters.availability);
  if (filters.minPrice !== undefined) params.set("minPrice", filters.minPrice.toString());
  if (filters.maxPrice !== undefined) params.set("maxPrice", filters.maxPrice.toString());
  if (filters.rating !== undefined) params.set("rating", filters.rating.toString());
  if (sort && sort !== "relevance") params.set("sort", sort);
  if (page > 1) params.set("page", page.toString());
  
  const appendArray = (name: string, arr?: string[]) => {
    if (arr && arr.length > 0) {
      params.set(name, arr.join(","));
    }
  };

  appendArray("brand", filters.brand);
  appendArray("shape", filters.shape);
  appendArray("length", filters.length);
  appendArray("colour", filters.colour);
  appendArray("texture", filters.texture);
  appendArray("style", filters.style);

  return params.toString();
}

function areFiltersEqual(a: FilterState, b: FilterState) {
  const keys = ["category", "minPrice", "maxPrice", "availability", "rating"] as const;
  for (const key of keys) {
    const valA = a[key] === null ? undefined : a[key];
    const valB = b[key] === null ? undefined : b[key];
    if (valA !== valB) return false;
  }
  
  const arrayKeys = ["brand", "shape", "length", "colour", "texture", "style"] as const;
  for (const key of arrayKeys) {
    const arrA = a[key];
    const arrB = b[key];
    const hasA = arrA && arrA.length > 0;
    const hasB = arrB && arrB.length > 0;
    if (!hasA && !hasB) continue;
    if (!hasA || !hasB) return false;
    if (arrA.length !== arrB.length) return false;
    
    const setA = new Set(arrA);
    for (const item of arrB) {
      if (!setA.has(item)) return false;
    }
  }
  return true;
}

export default function ShopCatalog() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);

  // 1. Resolve initial parameters from URL
  const initialQ = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category") || undefined;
  const initialAvailability = searchParams.get("availability") === "in_stock" ? "in_stock" : undefined;
  const initialSort = (searchParams.get("sort") || "relevance") as any;
  const initialPage = parseInt(searchParams.get("page") || "1", 10);
  const initialMinPrice = searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!, 10) : undefined;
  const initialMaxPrice = searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!, 10) : undefined;
  const initialRating = searchParams.get("rating") ? parseInt(searchParams.get("rating")!, 10) : undefined;

  const parseArray = (name: string) => {
    const val = searchParams.get(name);
    if (!val) return undefined;
    const arr = val.split(",").map((x) => x.trim()).filter(Boolean);
    return arr.length > 0 ? arr : undefined;
  };

  // 2. React State management
  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(initialPage);
  const [filters, setFilters] = useState<FilterState>({
    category: initialCategory,
    brand: parseArray("brand"),
    shape: parseArray("shape"),
    length: parseArray("length"),
    colour: parseArray("colour"),
    texture: parseArray("texture"),
    style: parseArray("style"),
    minPrice: initialMinPrice,
    maxPrice: initialMaxPrice,
    availability: initialAvailability,
    rating: initialRating,
  });

  const [data, setData] = useState<any>(null);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Navigation and Grid Layout customization controls
  const [navMode, setNavMode] = useState<"pagination" | "infinite_scroll">("pagination");
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(3);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Track latest state values in refs to prevent stale closures while keeping dependency array minimal
  const filtersRef = useRef(filters);
  const searchQueryRef = useRef(searchQuery);
  const pageRef = useRef(page);
  const sortRef = useRef(sort);

  filtersRef.current = filters;
  searchQueryRef.current = searchQuery;
  pageRef.current = page;
  sortRef.current = sort;

  // Sync state with URL search params when they change (e.g. from Mega Menu click)
  useEffect(() => {
    const nextQ = searchParams.get("q") || "";
    if (searchQueryRef.current !== nextQ) {
      setSearchQuery(nextQ);
    }

    const nextSort = searchParams.get("sort") || "relevance";
    if (sortRef.current !== nextSort) {
      setSort(nextSort);
    }

    const nextPage = parseInt(searchParams.get("page") || "1", 10);
    if (pageRef.current !== nextPage) {
      setPage(nextPage);
    }

    const nextFilters: FilterState = {
      category: searchParams.get("category") || undefined,
      brand: parseArray("brand"),
      shape: parseArray("shape"),
      length: parseArray("length"),
      colour: parseArray("colour"),
      texture: parseArray("texture"),
      style: parseArray("style"),
      minPrice: searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!, 10) : undefined,
      maxPrice: searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!, 10) : undefined,
      availability: searchParams.get("availability") === "in_stock" ? "in_stock" : undefined,
      rating: searchParams.get("rating") ? parseInt(searchParams.get("rating")!, 10) : undefined,
    };

    if (!areFiltersEqual(filtersRef.current, nextFilters)) {
      setFilters(nextFilters);
    }
  }, [searchParams]);

  // 3. Fetch search results from API when parameters change
  useEffect(() => {
    let isMounted = true;
    const fetchResults = async () => {
      const isMore = navMode === "infinite_scroll" && page > 1;
      
      if (isMore) {
        setIsFetchingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const qString = buildQueryString(filters, searchQuery, page, sort);
        const res = await fetch(`/api/search?${qString}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted) {
            setData(json);
            const newProducts = json.products || [];
            
            if (isMore) {
              setProductsList((prev) => {
                const existingIds = new Set(prev.map((p) => p.id));
                const filteredNew = newProducts.filter((p: any) => !existingIds.has(p.id));
                return [...prev, ...filteredNew];
              });
            } else {
              setProductsList(newProducts);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load search results:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsFetchingMore(false);
        }
      }
    };

    fetchResults();

    return () => {
      isMounted = false;
    };
  }, [filters, searchQuery, page, sort, navMode]);

  // 4. Sync State to Browser URL
  useEffect(() => {
    const qString = buildQueryString(filters, searchQuery, page, sort);
    const targetUrl = qString ? `${pathname}?${qString}` : pathname;
    router.replace(targetUrl, { scroll: false });
  }, [filters, searchQuery, page, sort, pathname, router]);

  // 5. Fetch recommended items if the current results are empty
  useEffect(() => {
    let isMounted = true;
    const fetchRecommendations = async () => {
      if (!isLoading && productsList.length === 0) {
        try {
          const res = await fetch(`/api/search?bestSeller=true&limit=4`);
          if (res.ok && isMounted) {
            const json = await res.json();
            setRecommendations(json.products || []);
          }
        } catch (err) {
          console.error("Failed to load recommendations:", err);
        }
      }
    };
    fetchRecommendations();
    return () => {
      isMounted = false;
    };
  }, [isLoading, productsList]);

  // 6. Infinite Scroll Observer Trigger
  useEffect(() => {
    if (navMode !== "infinite_scroll") return;
    
    const observerTarget = bottomRef.current;
    if (!observerTarget) return;

    const totalPages = data?.pagination?.totalPages || 1;
    if (page >= totalPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && !isFetchingMore) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    observer.observe(observerTarget);

    return () => {
      observer.unobserve(observerTarget);
    };
  }, [navMode, page, data?.pagination?.totalPages, isLoading, isFetchingMore]);

  // Reset page when mode or parameters change
  const handleNavModeChange = (mode: "pagination" | "infinite_scroll") => {
    if (navMode === mode) return;
    setIsLoading(true);
    setNavMode(mode);
    setPage(1);
    setProductsList([]);
  };

  const handleQueryChange = (val: string) => {
    if (searchQuery === val) return;
    setIsLoading(true);
    setSearchQuery(val);
    setPage(1);
    setProductsList([]);
  };

  const handleFiltersChange = (newFilters: FilterState) => {
    if (areFiltersEqual(filters, newFilters)) return;
    setIsLoading(true);
    setFilters(newFilters);
    setPage(1);
    setProductsList([]);
  };

  const handleClearFilters = () => {
    const isFiltersEmpty = areFiltersEqual(filters, {});
    const isQueryEmpty = searchQuery === "";
    if (isFiltersEmpty && isQueryEmpty) return;
    setIsLoading(true);
    setFilters({});
    setSearchQuery("");
    setPage(1);
    setProductsList([]);
  };

  const handleSearchSuggest = (tag: string) => {
    if (searchQuery === tag) return;
    setIsLoading(true);
    setSearchQuery(tag);
    setPage(1);
    setProductsList([]);
  };

  const handleSortChange = (val: string) => {
    if (sort === val) return;
    setIsLoading(true);
    setSort(val);
    setPage(1);
    setProductsList([]);
  };

  const pagination = data?.pagination || { page: 1, totalPages: 1, totalItems: 0 };
  const facets = data?.facets;

  // Compile active chips dynamically
  const activeChips: { id: string; label: string; onRemove: () => void }[] = [];

  if (filters.category) {
    activeChips.push({
      id: "category",
      label: `Category: ${filters.category}`,
      onRemove: () => handleFiltersChange({ ...filters, category: undefined }),
    });
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    let priceLabel = "Price: ";
    if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
      priceLabel += `₹${filters.minPrice / 100} - ₹${filters.maxPrice / 100}`;
    } else if (filters.minPrice !== undefined) {
      priceLabel += `Over ₹${filters.minPrice / 100}`;
    } else if (filters.maxPrice !== undefined) {
      priceLabel += `Under ₹${filters.maxPrice / 100}`;
    }
    activeChips.push({
      id: "price",
      label: priceLabel,
      onRemove: () => handleFiltersChange({ ...filters, minPrice: undefined, maxPrice: undefined }),
    });
  }

  if (filters.availability) {
    activeChips.push({
      id: "availability",
      label: "In Stock Only",
      onRemove: () => handleFiltersChange({ ...filters, availability: undefined }),
    });
  }

  if (filters.rating) {
    activeChips.push({
      id: "rating",
      label: `${filters.rating}★ & Above`,
      onRemove: () => handleFiltersChange({ ...filters, rating: undefined }),
    });
  }

  const addArrayChips = (field: keyof FilterState, name: string) => {
    const arr = filters[field] as string[] | undefined;
    if (arr && arr.length > 0) {
      arr.forEach((val) => {
        const capLabel = val.charAt(0).toUpperCase() + val.slice(1);
        activeChips.push({
          id: `${field}-${val}`,
          label: `${name}: ${capLabel}`,
          onRemove: () => {
            const updated = arr.filter((x) => x !== val);
            handleFiltersChange({
              ...filters,
              [field]: updated.length > 0 ? updated : undefined,
            });
          },
        });
      });
    }
  };

  addArrayChips("brand", "Brand");
  addArrayChips("shape", "Shape");
  addArrayChips("length", "Length");
  addArrayChips("colour", "Color");
  addArrayChips("texture", "Finish");
  addArrayChips("style", "Style");

  return (
    <div className="flex-1 bg-background text-foreground flex flex-col">
      {/* Search & Sort Panel Header */}
      <section className="bg-gradient-to-b from-secondary/30 to-background border-b border-border/20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-center md:text-left space-y-2">
            <h1 className="font-serif text-3xl md:text-4xl font-normal tracking-wide text-foreground">
              Our Nail <span className="font-serif italic font-light text-primary">Catalog</span>
            </h1>
            <p className="text-sm text-muted-foreground/80 font-light max-w-xl">
              Explore reusable, handcrafted salon-quality press-on nail sets, tailored to you.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <SearchBar value={searchQuery} onChange={handleQueryChange} />

            {/* Sort & Mobile Filter actions */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-full border border-border/55 text-xs font-semibold uppercase tracking-wider bg-background hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
              </button>

              <div className="relative flex items-center bg-secondary/15 border border-border/30 rounded-full px-3 py-1.5 focus-within:border-primary/50 transition-colors">
                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/80 mr-2" />
                <select
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="bg-transparent text-xs font-medium pr-6 outline-none appearance-none cursor-pointer border-none text-foreground"
                >
                  <option value="relevance">Sort: Relevance</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="newest">Sort: Newest</option>
                  <option value="best_selling">Best Selling</option>
                  <option value="featured">Featured First</option>
                  <option value="alpha_asc">Alphabetical: A-Z</option>
                  <option value="alpha_desc">Alphabetical: Z-A</option>
                </select>
                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/80 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mr-1">
            Active Filters:
          </span>
          {activeChips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1 text-[11px] bg-secondary/60 hover:bg-secondary border border-border/40 text-foreground px-2.5 py-1 rounded-full transition-all duration-300 font-medium"
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className="p-0.5 rounded-full hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                aria-label={`Remove ${chip.label}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          <button
            onClick={handleClearFilters}
            className="text-[10px] uppercase tracking-wider text-primary font-bold hover:text-primary/80 hover:underline transition-all cursor-pointer ml-1"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block lg:col-span-3">
            <FilterSidebar
              facets={facets}
              filters={filters}
              onChange={handleFiltersChange}
              onClear={handleClearFilters}
            />
          </aside>

          {/* Results Grid Panel */}
          <div className="lg:col-span-9 flex flex-col flex-1 space-y-6">
            {/* Dynamic Layout Control Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/10 pb-4">
              <span className="text-xs text-muted-foreground/80 font-light">
                {navMode === "infinite_scroll" 
                  ? `Loaded ${productsList.length} of ${pagination.totalItems} result(s)`
                  : `Showing ${productsList.length} of ${pagination.totalItems} result(s)`
                }
              </span>

              {/* Grid switches & Navigation mode switches */}
              <div className="flex flex-wrap items-center gap-4 justify-between sm:justify-end">
                {/* Navigation Mode Control (Pills) */}
                <div className="flex bg-secondary/15 border border-border/30 rounded-full p-1 text-xs">
                  <button
                    onClick={() => handleNavModeChange("pagination")}
                    className={`px-3 py-1 rounded-full font-medium transition-all duration-300 cursor-pointer ${
                      navMode === "pagination"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Classic Pages
                  </button>
                  <button
                    onClick={() => handleNavModeChange("infinite_scroll")}
                    className={`px-3 py-1 rounded-full font-medium transition-all duration-300 cursor-pointer ${
                      navMode === "infinite_scroll"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Auto Scroll
                  </button>
                </div>

                {/* Grid Density Switcher (Desktop Only) */}
                <div className="hidden sm:flex bg-secondary/15 border border-border/30 rounded-full p-1 text-xs gap-1">
                  {[2, 3, 4].map((cols) => (
                    <button
                      key={cols}
                      onClick={() => setGridCols(cols as any)}
                      className={`p-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                        gridCols === cols
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title={`${cols} columns layout`}
                    >
                      {cols === 2 && (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="7" height="18" rx="1" />
                          <rect x="14" y="3" width="7" height="18" rx="1" />
                        </svg>
                      )}
                      {cols === 3 && (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="3" width="5" height="18" rx="1" />
                          <rect x="9" y="3" width="6" height="18" rx="1" />
                          <rect x="17" y="3" width="5" height="18" rx="1" />
                        </svg>
                      )}
                      {cols === 4 && (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="3" width="4" height="18" rx="1" />
                          <rect x="7.5" y="3" width="4" height="18" rx="1" />
                          <rect x="13" y="3" width="4" height="18" rx="1" />
                          <rect x="18.5" y="3" width="3.5" height="18" rx="1" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Grid / Empty State */}
            <div className="flex-1">
              {!isLoading && !isFetchingMore && productsList.length === 0 ? (
                <SearchEmptyState
                  onClear={handleClearFilters}
                  onSearchSuggest={handleSearchSuggest}
                  recommendations={recommendations}
                />
              ) : (
                <SearchResults products={productsList} isLoading={isLoading} gridCols={gridCols} />
              )}
            </div>

            {/* Infinite Scroll target observer */}
            {navMode === "infinite_scroll" && (
              <div ref={bottomRef} className="py-8 flex flex-col items-center justify-center space-y-4">
                {isFetchingMore && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-light">
                    <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span>Loading more sets...</span>
                  </div>
                )}
                {page >= pagination.totalPages && productsList.length > 0 && (
                  <p className="text-xs text-muted-foreground/60 font-light italic">
                    You've viewed all {pagination.totalItems} luxury nail sets
                  </p>
                )}
              </div>
            )}

            {/* Pagination Controls */}
            {navMode === "pagination" && (
              <SearchPagination
                page={page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            )}
          </div>
        </div>
      </main>

      {/* Mobile sliding Drawer */}
      <FilterDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        facets={facets}
        filters={filters}
        onChange={handleFiltersChange}
        onClear={handleClearFilters}
      />
    </div>
  );
}

// Micro chevron selector icon helper
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}
