import React from "react";
import { PolicySectionData } from "@/content/policies/returns-refunds-policy";
import { PolicyCallout } from "./policy-callout";

interface PolicySectionProps {
  section: PolicySectionData;
}

export function PolicySection({ section }: PolicySectionProps) {
  return (
    <section id={section.id} className="scroll-mt-24 space-y-3.5 pb-8 border-b border-border/20 last:border-b-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs font-bold text-primary/70 bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 shrink-0">
          {section.number}
        </span>
        <h2 className="font-serif text-xl sm:text-2xl font-normal text-foreground tracking-wide">
          {section.title}
        </h2>
      </div>

      <div className="space-y-3 pl-0 sm:pl-10 text-xs sm:text-sm text-muted-foreground font-light leading-relaxed">
        {section.content.map((paragraph, idx) => (
          <p key={idx} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}

        {section.callout && (
          <PolicyCallout
            type={section.callout.type}
            title={section.callout.title}
            text={section.callout.text}
          />
        )}
      </div>
    </section>
  );
}
