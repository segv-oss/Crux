"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Terminal, Check, Copy, Sparkles, Shield, Github } from "lucide-react";

export function CTABox() {
  const [copied, setCopied] = useState(false);

  const copyCommand = () => {
    navigator.clipboard.writeText("npx crux-app@latest");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative py-28 z-10">
      <div className="max-w-5xl mx-auto px-6">
        
        <div className="relative rounded-3xl bg-gradient-to-b from-[#161922] via-[#12141a] to-[#0d0e12] border border-white/[0.12] p-8 sm:p-12 md:p-16 text-center shadow-[0_25px_80px_rgba(0,0,0,0.8)] overflow-hidden">
          
          {/* Subtle top spotlight */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full bg-white/[0.06] blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#a5adbb] mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[#d0d6e0]" />
              <span>Instant Team Setup</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f0f2f5] mb-5 leading-tight">
              Reclaim lost engineering hours today.
            </h2>

            <p className="text-sm sm:text-base text-[#9aa2ae] leading-relaxed mb-8">
              Eliminate review friction and context loss. Connect your GitHub repository in 60 seconds
              and empower your engineering team with the unified cockpit.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Link
                href="/cockpit"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#e6eaf0] hover:bg-white text-[#0c0d10] font-semibold text-sm transition-all duration-200 shadow-[0_0_30px_rgba(255,255,255,0.18)] active:scale-95"
              >
                <span>Launch Dedicated Cockpit</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3 px-4 py-3 rounded-xl bg-[#0c0d10] border border-white/[0.1] text-xs font-mono text-[#a5adbb]">
                <div className="flex items-center gap-2">
                  <span className="text-[#687180]">$</span>
                  <span>npx crux-app@latest</span>
                </div>
                <button
                  onClick={copyCommand}
                  className="p-1 rounded hover:bg-white/[0.08] text-[#8e97a5] hover:text-[#f0f2f5] transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 text-xs text-[#6e7786] flex-wrap font-mono">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#8e97a5]" />
                Zero code persistence
              </span>
              <span>•</span>
              <span>Self-hostable via Docker</span>
              <span>•</span>
              <span>MIT Licensed</span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
