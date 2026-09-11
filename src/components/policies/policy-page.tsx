import React from "react";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";
import { PolicyHeader } from "./policy-header";
import { PolicyToc } from "./policy-toc";
import { PolicySection } from "./policy-section";
import { PolicyDocumentData } from "@/content/policies/returns-refunds-policy";
import { PolicyConfig } from "@/content/policies/config";

interface PolicyPageProps {
  data: PolicyDocumentData;
  config: PolicyConfig;
}

export function PolicyPage({ data, config }: PolicyPageProps) {
  return (
    <div className="w-full bg-background min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 space-y-8">
        {/* Page Header */}
        <PolicyHeader
          title={data.title}
          badge={data.badge}
          description={data.description}
          lastUpdated={data.lastUpdated}
        />

        {/* Layout: TOC + Sections */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 pt-4">
          {/* Main Policy Content Column */}
          <main className="flex-1 min-w-0 space-y-10 order-2 lg:order-1">
            <div className="bg-card border border-border/40 rounded-3xl p-6 sm:p-10 space-y-10 shadow-xs">
              {data.sections.map((section) => (
                <PolicySection key={section.id} section={section} />
              ))}
            </div>

            {/* Bottom Contact / Support CTA Card */}
            <div className="bg-[#EFD3C9]/40 border border-primary/20 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Need Assistance?</span>
                  <h3 className="font-serif text-xl sm:text-2xl font-normal text-foreground">
                    Have questions about our policies?
                  </h3>
                  <p className="text-xs text-muted-foreground font-light max-w-xl">
                    Our client care team is available to assist you with order inquiries, sizing advice, returns, or shipping updates.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 shrink-0">
                  <a
                    href={`mailto:${config.supportEmail}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs font-medium transition-colors cursor-pointer shadow-xs"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email Support</span>
                  </a>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-border hover:bg-secondary/40 text-foreground rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    <span>Contact Form</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="pt-4 border-t border-primary/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground font-light">
                <div>
                  <strong className="font-semibold text-foreground">Registered Entity:</strong> {config.registeredBusinessName}
                </div>
                <div>
                  <strong className="font-semibold text-foreground">Legal Address:</strong> {config.legalPhysicalAddress}
                </div>
              </div>
            </div>
          </main>

          {/* Table of Contents (Right side on desktop, Top on mobile) */}
          <div className="order-1 lg:order-2 w-full lg:w-64 shrink-0">
            <PolicyToc sections={data.sections} />
          </div>
        </div>
      </div>
    </div>
  );
}
