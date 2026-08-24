"use client";

import React from "react";
import {
  Sparkles,
  Zap,
  Terminal,
  Cpu,
  Layers,
  ShieldCheck,
  GitMerge,
  Eye,
  Workflow,
  ArrowRight,
} from "lucide-react";

export function FeatureGrid() {
  const features = [
    {
      icon: Layers,
      tag: "Cockpit Architecture",
      title: "Three-Column Cognitive Convergence",
      description:
        "PR metadata, syntax-highlighted unified diffs, and synced Linear/Slack context side by side. Zero window switching, zero lost threads.",
      stat: "2.8h saved/wk",
    },
    {
      icon: Sparkles,
      tag: "AI Review Engine",
      title: "Actionable Reviewer Briefs",
      description:
        "Deterministic parsing detects schema migrations, critical execution paths, test coverage deltas, and breaking changes before human review begins.",
      stat: "40% faster triage",
    },
    {
      icon: Cpu,
      tag: "Ephemeral Compute",
      title: "Zero-Friction Test Sandbox",
      description:
        "Spin up isolated microVM branches with pre-loaded mock schemas in under 45 seconds. Verify multi-user sync live without local setups.",
      stat: "< 45s spin-up",
    },
    {
      icon: Zap,
      tag: "Real-time Protocol",
      title: "Sub-500ms Multi-Tool Sync",
      description:
        "Redis-backed pub/sub infrastructure propagates Slack messages, Linear task completions, and GitHub commit pushes across all active team seats.",
      stat: "34ms avg latency",
    },
    {
      icon: ShieldCheck,
      tag: "Enterprise Security",
      title: "Zero Code Storage Guarantee",
      description:
        "Code ASTs are analyzed purely in-memory and immediately discarded. Scoped tokens, private subnet support, and self-hosted air-gap deployments.",
      stat: "SOC2 Type II ready",
    },
    {
      icon: GitMerge,
      tag: "Automation Engine",
      title: "Smart Merge Gate Verification",
      description:
        "Enforces atomic merge queues, schema sanity checks, and multi-service dependency validations to prevent broken main branch regressions.",
      stat: "99.99% main uptime",
    },
  ];

  return (
    <section id="features" className="relative py-24 z-10">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#a5adbb] mb-4">
            <span>Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f0f2f5] mb-5">
            Engineered for high-velocity software engineering teams.
          </h2>
          <p className="text-base text-[#9aa2ae] leading-relaxed">
            Eliminate cognitive friction across the entire pull request lifecycle with real-time
            infrastructure and deterministic intelligence.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, idx) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={idx}
                className="group relative rounded-2xl bg-[#12141a]/80 border border-white/[0.07] p-7 hover:border-white/[0.18] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[#181b22] border border-white/[0.08] flex items-center justify-center text-[#e2e6eb] group-hover:border-white/20 group-hover:bg-[#20252e] transition-colors">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/[0.04] text-[#8e97a5] border border-white/[0.06]">
                      {feature.stat}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-[#7e8796] mb-2">{feature.tag}</div>
                  <h3 className="text-lg font-semibold text-[#f0f2f5] mb-3 group-hover:text-white transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[#9aa2ae] leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-white/[0.04] flex items-center text-xs font-medium text-[#c4cbd4] group-hover:text-white transition-colors">
                  <span>Explore documentation</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
