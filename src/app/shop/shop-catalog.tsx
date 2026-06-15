"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { FilterSidebar, FilterState } from "@/features/catalog/filter-sidebar";
import { FilterDrawer } from "@/features/catalog/filter-drawer";
import { SearchBar } from "@/features/catalog/search-bar";
import { SearchResults } from "@/features/catalog/search-results";
import { SearchPagination } from "@/features/catalog/search-pagination";
import { SearchEmptyState } from "@/features/catalog/search-empty-state";
import { SlidersHorizontal, ArrowUpDown } from "lucide-react";

// Helper to compile search filters into query string
function buildQueryString(filters: FilterState, q: string, page: number, sort: string) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (filters.category) params.set("category", filters.category);
  if (filters.availability) params.set("availability", filters.availability);
  if (filters.minPrice !== undefined) params.set("minPrice", filters.minPrice.toString());
  if (filters.maxPrice !== undefined) params.set("maxPrice", filters.maxPrice.toString());
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

  return params.toString();
}

export default function ShopCatalog() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // 1. Resolve initial parameters from URL
  const initialQ = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category") || undefined;
  const initialAvailability = searchParams.get("availability") as "in_stock" | undefined;
  const initialSort = (searchParams.get("sort") || "relevance") as any;
  const initialPage = parseInt(searchParams.get("page") || "1", 10);
  const initialMinPrice = searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!, 10) : undefined;
  const initialMaxPrice = searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!, 10) : undefined;

  const parseArray = (name: string) => {
    const val = searchParams.get(name);
    return val ? val.split(",") : undefined;
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
    minPrice: initialMinPrice,
    maxPrice: initialMaxPrice,
    availability: initialAvailability,
  });

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 3. Fetch search results from API when parameters change
  useEffect(() => {
    let isMounted = true;
    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const qString = buildQueryString(filters, searchQuery, page, sort);
        const res = await fetch(`/api/search?${qString}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted) {
            setData(json);
          }
        }
      } catch (err) {
        console.error("Failed to load search results:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchResults();

    return () => {
      isMounted = false;
    };
  }, [filters, searchQuery, page, sort]);

  // 4. Sync State to Browser URL
  useEffect(() => {
    const qString = buildQueryString(filters, searchQuery, page, sort);
    const targetUrl = qString ? `${pathname}?${qString}` : pathname;
    window.history.replaceState(null, "", targetUrl);
  }, [filters, searchQuery, page, sort, pathname]);

  // Reset pagination to page 1 when query or filters change
  const handleQueryChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchQuery("");
    setPage(1);
  };

  const handleSearchSuggest = (tag: string) => {
    setSearchQuery(tag);
    setPage(1);
  };

  const productsList = data?.products || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, totalItems: 0 };
  const facets = data?.facets;

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
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-full border border-border/50 text-xs font-semibold uppercase tracking-wider bg-background hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
              </button>

              <div className="relative flex items-center bg-secondary/15 border border-border/30 rounded-full px-3 py-1.5 focus-within:border-primary/50 transition-colors">
                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/80 mr-2" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="bg-transparent text-xs font-medium pr-6 outline-none appearance-none cursor-pointer border-none text-foreground"
                >
                  <option value="relevance">Sort: Relevance</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="newest">Sort: Newest</option>
                </select>
                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/80 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col">
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
            <div className="flex items-center justify-between text-xs text-muted-foreground/80 font-light border-b border-border/10 pb-3">
              <span>
                Showing {productsList.length} of {pagination.totalItems} result(s)
              </span>
            </div>

            {/* Results Grid / Empty State */}
            <div className="flex-1">
              {!isLoading && productsList.length === 0 ? (
                <SearchEmptyState
                  onClear={handleClearFilters}
                  onSearchSuggest={handleSearchSuggest}
                />
              ) : (
                <SearchResults products={productsList} isLoading={isLoading} />
              )}
            </div>

            {/* Pagination Controls */}
            <SearchPagination
              page={page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
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
