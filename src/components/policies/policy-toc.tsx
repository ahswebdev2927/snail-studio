"use client";

import React, { useState, useEffect } from "react";
import { List, ChevronDown } from "lucide-react";
import { PolicySectionData } from "@/content/policies/returns-refunds-policy";
import { cn } from "@/lib/utils";

interface PolicyTocProps {
  sections: PolicySectionData[];
}

export function PolicyToc({ sections }: PolicyTocProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id || "");
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140;

      for (let i = sections.length - 1; i >= 0; i--) {
        const sectionEl = document.getElementById(sections[i].id);
        if (sectionEl) {
          const top = sectionEl.offsetTop;
          if (scrollPosition >= top) {
            setActiveId(sections[i].id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const scrollToSection = (id: string) => {
    setActiveId(id);
    setIsOpenMobile(false);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -100;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <>
      {/* Mobile Accordion Table of Contents */}
      <div className="lg:hidden w-full mb-8 border border-border/40 rounded-2xl bg-secondary/20 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-semibold text-foreground uppercase tracking-wider cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <List className="w-4 h-4 text-primary" />
            <span>On This Page ({sections.length} Sections)</span>
          </span>
          <ChevronDown
            className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", isOpenMobile && "rotate-180")}
          />
        </button>

        {isOpenMobile && (
          <div className="px-5 pb-4 pt-1 border-t border-border/20 max-h-72 overflow-y-auto space-y-1">
            {sections.map((section) => {
              const isActive = activeId === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "w-full text-left py-2 px-3 rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 font-light"
                  )}
                >
                  <span className="font-mono text-[10px] text-muted-foreground">{section.number}</span>
                  <span className="truncate">{section.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Sticky Table of Contents */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-24 space-y-4 p-5 rounded-3xl bg-secondary/20 border border-border/30 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-none">
          <div className="flex items-center gap-2 pb-3 border-b border-border/20 text-xs font-bold uppercase tracking-wider text-foreground">
            <List className="w-4 h-4 text-primary" />
            <span>Table of Contents</span>
          </div>

          <nav className="space-y-1">
            {sections.map((section) => {
              const isActive = activeId === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "w-full text-left py-1.5 px-3 rounded-xl text-xs transition-all duration-200 flex items-center gap-2 cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 font-light"
                  )}
                >
                  <span className={cn("font-mono text-[10px]", isActive ? "text-primary-foreground" : "text-muted-foreground")}>
                    {section.number}
                  </span>
                  <span className="truncate">{section.title}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
