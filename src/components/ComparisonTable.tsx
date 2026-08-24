import React from "react";
import { Check, X } from "lucide-react";

export function ComparisonTable() {
  const comparisonRows = [
    {
      feature: "Unified 3-Column Cockpit (PR + Diff + Tasks + Chat)",
      crux: true,
      legacy: false,
      note: "All context visible without switching browser tabs",
    },
    {
      feature: "AI Reviewer Briefs with Schema & Breaking Change Scan",
      crux: true,
      legacy: false,
      note: "Pre-review scan flags schema regressions automatically",
    },
    {
      feature: "One-Click Ephemeral Sandbox Testing (w/ Mock Data)",
      crux: true,
      legacy: false,
      note: "Verify branches live in under 45s with pre-loaded mock state",
    },
    {
      feature: "Bi-directional Slack & Linear Real-time State Sync",
      crux: true,
      legacy: "Partial (Unidirectional bots)",
      note: "Actions taken in Crux mirror back to GitHub and Linear",
    },
    {
      feature: "Zero Code Storage Architecture (In-Memory AST)",
      crux: true,
      legacy: "Third-party cloud storage",
      note: "Code analyzed purely in memory; zero persistence",
    },
    {
      feature: "Average Review Turnaround Time",
      crux: "~ 18 minutes",
      legacy: "~ 4.5 hours",
      note: "Eliminates back-and-forth round trips",
    },
  ];

  return (
    <section id="comparison" className="relative py-24 bg-[#0a0b0e] border-y border-white/[0.06] z-10">
      <div className="max-w-6xl mx-auto px-6">
        
        <div className="max-w-3xl mb-16 text-center mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#a5adbb] mb-4">
            <span>Workflow Matrix</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f0f2f5] mb-4">
            Why high-output engineering teams switch to Crux.
          </h2>
          <p className="text-sm sm:text-base text-[#9aa2ae]">
            Compare the unified Crux cockpit against traditional fragmented developer toolchains.
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.1] bg-[#12141a] overflow-hidden shadow-2xl">
          <div className="grid grid-cols-12 p-4 sm:p-5 border-b border-white/[0.08] bg-[#15181f] text-xs font-mono text-[#a0a8b6] items-center">
            <div className="col-span-6 font-semibold text-[#f0f2f5]">CAPABILITY & METRICS</div>
            <div className="col-span-3 text-center font-semibold text-[#e2e6eb]">CRUX PLATFORM</div>
            <div className="col-span-3 text-center text-[#7e8796]">FRAGMENTED STACK</div>
          </div>

          <div className="divide-y divide-white/[0.05]">
            {comparisonRows.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 p-4 sm:p-5 items-center text-xs hover:bg-white/[0.02] transition-colors"
              >
                <div className="col-span-6 pr-4">
                  <div className="font-medium text-[#e2e6eb] mb-1">{row.feature}</div>
                  <div className="text-[11px] text-[#6e7786]">{row.note}</div>
                </div>

                <div className="col-span-3 flex justify-center text-center">
                  {typeof row.crux === "boolean" ? (
                    <div className="w-6 h-6 rounded-full bg-white/[0.08] border border-white/[0.2] flex items-center justify-center text-[#f0f2f5]">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <span className="font-mono font-semibold text-[#f0f2f5] bg-white/[0.06] px-2.5 py-1 rounded">
                      {row.crux}
                    </span>
                  )}
                </div>

                <div className="col-span-3 flex justify-center text-center text-[#7e8796]">
                  {typeof row.legacy === "boolean" ? (
                    <div className="w-6 h-6 rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-[#555d6b]">
                      <X className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <span className="font-mono text-[#6e7786]">{row.legacy}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
