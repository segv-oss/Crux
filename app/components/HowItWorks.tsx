"use client";

import React, { useState } from "react";
import { GitPullRequest, Sparkles, Terminal, CheckCircle2, Play, Code2 } from "lucide-react";

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      num: "01",
      title: "Developer pushes branch & creates PR",
      subtitle: "Instant webhook trigger with zero configuration",
      description:
        "When a pull request is opened on GitHub, Crux receives the webhook payload, parses the AST diff in-memory, and binds the corresponding Linear issue and Slack conversation thread.",
      code: `$ git push origin feat/distributed-lock
$ gh pr create --fill --label "concurrency,backend"

[Crux Webhook] Handled PR #342 in 18ms
[AST Engine] Parsed 6 files (284 additions, 42 deletions)
[Linear Sync] Bound to issue CRX-410 (Distributed lock)`,
    },
    {
      num: "02",
      title: "AI Reviewer Brief analyzes critical path",
      subtitle: "Deterministic code intelligence in < 30 seconds",
      description:
        "The Crux intelligence engine scans schema migrations, API contract differences, test coverage gaps, and concurrency hazards to generate a 2-minute actionable reviewer brief.",
      code: `⚡ Generating Reviewer Brief for PR #342:
✓ Schema changes: 0 detected (No database migration)
✓ Test coverage delta: +4.2% (14 new unit assertions)
✓ Critical paths flagged:
   - src/concurrency/redlock.ts -> acquire()
   - src/concurrency/redlock.ts -> renewHeartbeat()
✓ Risk assessment: MEDIUM (Review estimate: 12 min)`,
    },
    {
      num: "03",
      title: "Reviewers inspect live in the Cockpit",
      subtitle: "Unified diffs, task checklists, and live Slack chat",
      description:
        "Reviewers collaborate in real-time in the 3-column cockpit. Comments written in Crux mirror to GitHub and Slack instantaneously via WebSocket pub/sub.",
      code: `[Cockpit] Active session: @sarah.chen, @alex.morris
[Socket Sync] Line annotation added at redlock.ts:57
[Slack Bot] Notified #eng-reviews: "New comment on PR #342"
[Linear Sync] Checked off subtask CRX-411`,
    },
    {
      num: "04",
      title: "One-click sandbox verification & safe merge",
      subtitle: "Test live in pre-seeded microVM container",
      description:
        "Reviewers launch an ephemeral sandbox to validate edge cases live with realistic mock data, then merge with automated atomic queue verification.",
      code: `$ crux sandbox run --branch feat/distributed-lock
✓ MicroVM container active at: https://sandbox-pr342.crux.dev
✓ 10,000 seeded test entities loaded
✓ Stress test: 500 concurrent lock requests -> 0 collisions
✓ All gates verified -> PR #342 safely merged into main`,
    },
  ];

  return (
    <section id="how-it-works" className="relative py-24 bg-[#0a0b0e] border-y border-white/[0.06] z-10">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Title */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#a5adbb] mb-4">
            <span>Execution Flow</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f0f2f5] mb-4">
            From PR creation to confident production deployment.
          </h2>
          <p className="text-sm sm:text-base text-[#9aa2ae]">
            Watch how Crux orchestrates context, intelligence, and execution across your stack.
          </p>
        </div>

        {/* Step Tabs & Terminal Viewer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Steps List */}
          <div className="lg:col-span-5 space-y-3">
            {steps.map((step, idx) => {
              const isSelected = activeStep === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`p-5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-[#14171f] border-white/[0.2] shadow-[0_4px_25px_rgba(0,0,0,0.5)]"
                      : "bg-[#101217]/50 border-white/[0.05] hover:border-white/[0.1] hover:bg-[#12141a]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-[#7e8796] font-bold">STEP {step.num}</span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-[#d0d6e0] shadow-[0_0_8px_#ffffff]" />
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-[#f0f2f5] mb-1.5">{step.title}</h3>
                  <p className="text-xs text-[#8e97a5] leading-relaxed mb-2">{step.description}</p>
                </div>
              );
            })}
          </div>

          {/* Right Terminal Window */}
          <div className="lg:col-span-7 rounded-2xl bg-[#0e1015] border border-white/[0.12] overflow-hidden shadow-2xl">
            <div className="h-10 bg-[#15171e] border-b border-white/[0.08] px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2a2e38]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#2a2e38]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#2a2e38]" />
                <span className="ml-2 text-xs font-mono text-[#7e8796]">crux-cli — execution log</span>
              </div>
              <span className="text-[11px] font-mono text-[#687180]">
                Step {steps[activeStep].num}/04
              </span>
            </div>

            <div className="p-6 font-mono text-xs text-[#c4cbd4] leading-relaxed min-h-[340px] flex flex-col justify-between">
              <pre className="whitespace-pre-wrap font-mono text-[#d2d7e0] leading-6">
                {steps[activeStep].code}
              </pre>

              <div className="pt-4 mt-6 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#6e7786]">
                <span>Status: Completed successfully</span>
                <span className="text-emerald-400">Exit Code: 0</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
