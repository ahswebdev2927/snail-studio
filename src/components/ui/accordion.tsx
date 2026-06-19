import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionContextValue {
  activeValues: string[];
  toggleValue: (value: string) => void;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

function useAccordion() {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error("Accordion components must be used within an Accordion element");
  }
  return context;
}

export interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple";
  defaultValue?: string | string[];
}

export function Accordion({
  type = "single",
  defaultValue,
  className,
  children,
  ...props
}: AccordionProps) {
  const [activeValues, setActiveValues] = React.useState<string[]>(() => {
    if (!defaultValue) return [];
    return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
  });

  const toggleValue = React.useCallback(
    (value: string) => {
      setActiveValues((prev) => {
        if (type === "single") {
          return prev.includes(value) ? [] : [value];
        } else {
          return prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
        }
      });
    },
    [type]
  );

  return (
    <AccordionContext.Provider value={{ activeValues, toggleValue }}>
      <div className={cn("divide-y divide-border/40", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

interface AccordionItemContextValue {
  value: string;
  isOpen: boolean;
}

const AccordionItemContext = React.createContext<AccordionItemContextValue | null>(null);

export function AccordionItem({ className, value, children, ...props }: AccordionItemProps) {
  const { activeValues } = useAccordion();
  const isOpen = activeValues.includes(value);

  return (
    <AccordionItemContext.Provider value={{ value, isOpen }}>
      <div className={cn("py-2.5 border-b border-border/10", className)} {...props}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggleValue } = useAccordion();
  const itemContext = React.useContext(AccordionItemContext);

  if (!itemContext) {
    throw new Error("AccordionTrigger must be used within an AccordionItem");
  }

  const { value, isOpen } = itemContext;

  return (
    <button
      type="button"
      onClick={() => toggleValue(value)}
      className={cn(
        "flex w-full items-center justify-between py-4 text-sm font-semibold text-left text-foreground hover:text-primary transition-all duration-200 cursor-pointer select-none",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180 text-primary"
        )}
      />
    </button>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const itemContext = React.useContext(AccordionItemContext);

  if (!itemContext) {
    throw new Error("AccordionContent must be used within an AccordionItem");
  }

  const { isOpen } = itemContext;

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "overflow-hidden text-xs font-light leading-relaxed text-muted-foreground pb-4 animate-in fade-in duration-200 slide-in-from-top-1",
        className
      )}
      {...props}
    >
      <div className="pt-1">{children}</div>
    </div>
  );
}
