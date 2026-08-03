"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface RangeSliderProps {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
  className?: string;
}

export function RangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChange,
  className,
}: RangeSliderProps) {
  // Local state to keep dragging smooth and prevent premature network calls
  const [minVal, setMinVal] = React.useState(valueMin);
  const [maxVal, setMaxVal] = React.useState(valueMax);

  const minValRef = React.useRef(valueMin);
  const maxValRef = React.useRef(valueMax);
  const rangeRef = React.useRef<HTMLDivElement>(null);

  // Sync state if initial value changes externally (e.g. after clear)
  React.useEffect(() => {
    setMinVal(valueMin);
    minValRef.current = valueMin;
  }, [valueMin]);

  React.useEffect(() => {
    setMaxVal(valueMax);
    maxValRef.current = valueMax;
  }, [valueMax]);

  // Convert to percentage
  const getPercent = React.useCallback(
    (value: number) => {
      const rangeVal = max - min;
      return rangeVal === 0 ? 0 : Math.round(((value - min) / rangeVal) * 100);
    },
    [min, max]
  );

  // Set width and left of range bar from min val change
  React.useEffect(() => {
    const minPercent = getPercent(minVal);
    const maxPercent = getPercent(maxValRef.current);

    if (rangeRef.current) {
      rangeRef.current.style.left = `${minPercent}%`;
      rangeRef.current.style.width = `${maxPercent - minPercent}%`;
    }
  }, [minVal, getPercent]);

  // Set width of range bar from max val change
  React.useEffect(() => {
    const minPercent = getPercent(minValRef.current);
    const maxPercent = getPercent(maxVal);

    if (rangeRef.current) {
      rangeRef.current.style.width = `${maxPercent - minPercent}%`;
    }
  }, [maxVal, getPercent]);

  const handleMinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(event.target.value), maxVal - 1);
    setMinVal(value);
    minValRef.current = value;
  };

  const handleMaxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(event.target.value), minVal + 1);
    setMaxVal(value);
    maxValRef.current = value;
  };

  const handleTriggerChange = () => {
    onChange(minVal, maxVal);
  };

  return (
    <div className={cn("w-full flex flex-col space-y-4 font-sans select-none", className)}>
      <div className="relative w-full h-6 flex items-center">
        {/* Min Input Slider */}
        <input
          type="range"
          min={min}
          max={max}
          value={minVal}
          onChange={handleMinChange}
          onMouseUp={handleTriggerChange}
          onTouchEnd={handleTriggerChange}
          className="price-slider-input"
          style={{ zIndex: minVal > max - 100 ? 25 : 20 }}
        />
        {/* Max Input Slider */}
        <input
          type="range"
          min={min}
          max={max}
          value={maxVal}
          onChange={handleMaxChange}
          onMouseUp={handleTriggerChange}
          onTouchEnd={handleTriggerChange}
          className="price-slider-input"
        />

        {/* Track highlights */}
        <div className="price-slider-track" />
        <div ref={rangeRef} className="price-slider-range" />
      </div>

      {/* Real-time Display Labels */}
      <div className="flex items-center justify-between text-xs font-semibold text-foreground/80">
        <div className="px-3 py-2 rounded-xl border border-border/30 bg-secondary/10 flex-1">
          <span className="text-[9px] text-muted-foreground/60 block font-light leading-none mb-0.5">Min Price</span>
          <span>₹{minVal}</span>
        </div>
        <div className="w-6 h-[1px] bg-border/40 shrink-0 mx-2" />
        <div className="px-3 py-2 rounded-xl border border-border/30 bg-secondary/10 flex-1 text-right">
          <span className="text-[9px] text-muted-foreground/60 block font-light leading-none mb-0.5">Max Price</span>
          <span>₹{maxVal}</span>
        </div>
      </div>
    </div>
  );
}
