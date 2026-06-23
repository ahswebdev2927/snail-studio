"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const isMounted = useRef(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    const handler = setTimeout(() => {
      onChange(localValue);
    }, 300); // 300ms debounce as recommended

    return () => clearTimeout(handler);
  }, [localValue, onChange]);

  return (
    <div className="relative w-full max-w-2xl group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-muted-foreground/80 group-focus-within:text-primary transition-colors" />
      </div>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder="Search premium nails (e.g. ombre, matte, stiletto)..."
        className="block w-full pl-11 pr-10 py-3 text-sm bg-secondary/20 hover:bg-secondary/40 focus:bg-background border border-border/40 hover:border-border/80 focus:border-primary/60 rounded-full focus:ring-2 focus:ring-primary/5 transition-all duration-300 outline-none font-light placeholder:text-muted-foreground/60 text-foreground"
      />
      {localValue && (
        <button
          onClick={() => setLocalValue("")}
          className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground/60 hover:text-foreground transition-colors"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
