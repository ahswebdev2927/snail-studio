"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string; // Header inside the dropdown list (e.g. "Fruits")
  className?: string; // Wrapper className
  triggerClassName?: string; // Trigger button className
  popoverClassName?: string; // Dropdown popover className
  disabled?: boolean;
  leftIcon?: React.ReactNode; // Optional prefix icon on the left
}

export function Select({
  options,
  value,
  onChange,
  placeholder = "Select...",
  label,
  className,
  triggerClassName,
  popoverClassName,
  disabled = false,
  leftIcon,
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close when clicking outside of the component
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full text-left font-sans select-none", className)}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full px-4 py-2.5 text-xs font-medium text-foreground bg-input border border-border rounded-xl transition-all cursor-pointer outline-hidden focus:border-primary/50 disabled:opacity-50 disabled:pointer-events-none hover:bg-secondary/5 duration-200",
          isOpen && "border-primary/60 ring-1 ring-primary/30",
          triggerClassName
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground/80 shrink-0 transition-transform duration-200 ml-2",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 w-full mt-1.5 border shadow-xl rounded-2xl bg-popover border-border/80 py-1.5 focus:outline-hidden min-w-[160px] animate-in fade-in-0 zoom-in-95 duration-100",
            popoverClassName
          )}
        >
          {label && (
            <div className="px-3.5 py-1 text-[10px] font-semibold text-muted-foreground/75 uppercase tracking-wider select-none">
              {label}
            </div>
          )}
          <div className="flex flex-col max-h-60 overflow-y-auto">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    "flex items-center justify-between w-full px-3.5 py-2 text-xs text-left transition-colors cursor-pointer select-none text-foreground hover:bg-secondary/10 disabled:opacity-40 disabled:cursor-not-allowed",
                    isSelected && "font-semibold"
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-foreground shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
