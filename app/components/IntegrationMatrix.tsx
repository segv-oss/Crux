"use client";

import React from "react";
import { Github, MessageSquare, Layers, Cpu, Database, Shield, Zap } from "lucide-react";

export function IntegrationMatrix() {
  const integrations = [
    {
      name: "GitHub",
      category: "Source Control & PRs",
      desc: "Instant webhooks for PRs, reviews, commits, checks, and automated merge queues.",
      icon: Github,
      badge: "Real-time Webhook",
    },
    {
      name: "Linear",
      category: "Issue Tracking",
      desc: "Bi-directional sync of tickets, sub-tasks, cycles, estimates, and status transitions.",
      icon: Layers,
      badge: "Bi-directional",
    },
    {
      name: "Slack",
      category: "Team Communications",
      desc: "Thread syncing, automated reviewer briefs, guest sandbox links, and approval notifications.",
      icon: MessageSquare,
      badge: "Socket Sync",
    },
    {
      name: "Claude & DeepSeek AI",
      category: "Code Intelligence",
      desc: "AST scanning for breaking changes, test coverage gap detection, and impact vector mapping.",
      icon: Zap,
      badge: "Sub-30s Inference",
    },
    {
      name: "Redis & WebSockets",
      category: "Collab Transport",
      desc: "Distributed event bus ensuring sub-500ms multi-user live cursors and review sessions.",
      icon: Database,
      badge: "< 50ms Pub/Sub",
    },
    {
      name: "Docker MicroVM",
      category: "Instant Sandboxes",
      desc: "Lightweight isolated preview containers with pre-seeded datasets and zero auth hurdles.",
      icon: Cpu,
      badge: "Firecracker VMs",
    },
  ];

  return (
    <section id="integrations" className="relative py-24 z-10">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#a5adbb] mb-4">
            <span>Ecosystem</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f0f2f5] mb-4">
            Connects natively with your existing dev stack.
          </h2>
          <p className="text-sm sm:text-base text-[#9aa2ae]">
            Crux acts as an intelligent orchestration layer on top of the tools you already rely on.
          </p>
        </div>

        {/* Integration Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {integrations.map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#12141a]/80 border border-white/[0.07] hover:border-white/[0.18] transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#181b22] border border-white/[0.08] flex items-center justify-center text-[#e2e6eb]">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[#8e97a5]">
                      {item.badge}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-[#7e8796] mb-1">{item.category}</div>
                  <h3 className="text-base font-semibold text-[#f0f2f5] mb-2">{item.name}</h3>
                  <p className="text-xs text-[#9aa2ae] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
